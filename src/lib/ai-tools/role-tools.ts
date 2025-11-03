import { tool } from 'ai';
import { z } from 'zod';
import { PermissionFlagsBits } from 'discord.js';
import type { AIToolContext } from './types.js';

/**
 * Tools for managing roles
 */
export function createRoleTools(context: AIToolContext) {
	return {
		/**
		 * Create a new role
		 */
		createRole: tool({
			description: 'Create a new role in the guild. Use this when asked to create a role.',
			parameters: z.object({
				name: z.string().describe('The name of the role'),
				color: z.string().optional().describe('The color of the role (hex code like #FF0000 or color name)'),
				hoist: z.boolean().optional().describe('Whether to display role members separately'),
				mentionable: z.boolean().optional().describe('Whether the role can be mentioned')
			}),
			execute: async ({ name, color, hoist, mentionable }) => {
				try {
					const role = await context.guild.roles.create({
						name,
						color: color as any,
						hoist: hoist || false,
						mentionable: mentionable || false
					});

					return `✅ Successfully created role: ${role.name} (ID: ${role.id})`;
				} catch (error) {
					return `❌ Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Delete a role
		 */
		deleteRole: tool({
			description: 'Delete a role from the guild. Use this when asked to delete or remove a role.',
			parameters: z.object({
				roleId: z.string().describe('The ID of the role to delete')
			}),
			execute: async ({ roleId }) => {
				try {
					const role = await context.guild.roles.fetch(roleId);
					if (!role) return '❌ Role not found';
					const roleName = role.name;
					await role.delete();
					return `✅ Successfully deleted role: ${roleName}`;
				} catch (error) {
					return `❌ Failed to delete role: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Edit a role
		 */
		editRole: tool({
			description: 'Edit role properties. Use this when asked to change role name, color, or other properties.',
			parameters: z.object({
				roleId: z.string().describe('The ID of the role to edit'),
				name: z.string().optional().describe('New name for the role'),
				color: z.string().optional().describe('New color (hex code or color name)'),
				hoist: z.boolean().optional().describe('Whether to display role members separately'),
				mentionable: z.boolean().optional().describe('Whether the role can be mentioned')
			}),
			execute: async ({ roleId, name, color, hoist, mentionable }) => {
				try {
					const role = await context.guild.roles.fetch(roleId);
					if (!role) return '❌ Role not found';

					await role.edit({
						name: name || role.name,
						color: (color as any) || role.color,
						hoist: hoist !== undefined ? hoist : role.hoist,
						mentionable: mentionable !== undefined ? mentionable : role.mentionable
					});

					return `✅ Successfully updated role: ${role.name}`;
				} catch (error) {
					return `❌ Failed to edit role: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Set role permissions
		 */
		setRolePermissions: tool({
			description: 'Set permissions for a role. Use this when asked to change role permissions.',
			parameters: z.object({
				roleId: z.string().describe('The ID of the role'),
				permissions: z
					.array(z.string())
					.describe(
						'Array of permission names (e.g., ["Administrator", "ManageChannels", "BanMembers"]). See Discord.js PermissionFlagsBits for valid names.'
					)
			}),
			execute: async ({ roleId, permissions }) => {
				try {
					const role = await context.guild.roles.fetch(roleId);
					if (!role) return '❌ Role not found';

					// Convert permission names to bitfield
					const permissionBits = permissions
						.map((perm) => {
							const key = perm as keyof typeof PermissionFlagsBits;
							return PermissionFlagsBits[key];
						})
						.filter(Boolean);

					await role.setPermissions(permissionBits);
					return `✅ Successfully updated permissions for role: ${role.name}`;
				} catch (error) {
					return `❌ Failed to set permissions: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Get role information
		 */
		getRoleInfo: tool({
			description: 'Get information about a role. Use this when asked about role details or permissions.',
			parameters: z.object({
				roleId: z.string().describe('The ID of the role')
			}),
			execute: async ({ roleId }) => {
				try {
					const role = await context.guild.roles.fetch(roleId);
					if (!role) return '❌ Role not found';

					const permissions = role.permissions.toArray().join(', ') || 'None';
					const memberCount = context.guild.members.cache.filter((m) => m.roles.cache.has(role.id)).size;

					return `**Role Info: ${role.name}**
- ID: ${role.id}
- Color: ${role.hexColor}
- Position: ${role.position}
- Hoisted: ${role.hoist ? 'Yes' : 'No'}
- Mentionable: ${role.mentionable ? 'Yes' : 'No'}
- Members: ${memberCount}
- Created: ${new Date(role.createdAt).toLocaleDateString()}
- Permissions: ${permissions.substring(0, 500)}${permissions.length > 500 ? '...' : ''}`;
				} catch (error) {
					return `❌ Failed to get role info: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * List all roles in the guild
		 */
		listRoles: tool({
			description: 'List all roles in the guild. Use this when asked to list roles.',
			parameters: z.object({}),
			execute: async () => {
				try {
					const roles = Array.from(context.guild.roles.cache.values())
						.filter((r) => r.name !== '@everyone')
						.sort((a, b) => b.position - a.position);

					const roleList = roles.map((r) => `- ${r.name} (ID: ${r.id}, Members: ${r.members.size})`).join('\n');

					return `**Roles in ${context.guild.name}:**\n${roleList || 'No roles found'}`;
				} catch (error) {
					return `❌ Failed to list roles: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Find a role by name
		 */
		findRoleByName: tool({
			description: 'Find a role by name (case-insensitive partial match). Use this when you need to find a role ID from its name.',
			parameters: z.object({
				name: z.string().describe('The name (or partial name) of the role to find')
			}),
			execute: async ({ name }) => {
				try {
					const role = context.guild.roles.cache.find((r) => r.name.toLowerCase().includes(name.toLowerCase()));

					if (!role) {
						return `❌ No role found matching "${name}"`;
					}

					return `✅ Found role: ${role.name} (ID: ${role.id})`;
				} catch (error) {
					return `❌ Failed to find role: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		})
	};
}
