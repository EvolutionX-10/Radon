import { tool } from 'ai';
import { z } from 'zod';
import type { AIToolContext } from './types.js';

/**
 * Tools for managing guild members
 */
export function createMemberTools(context: AIToolContext) {
	return {
		/**
		 * Ban a member from the guild
		 */
		banMember: tool({
			description: 'Ban a member from the Discord server. Use this when asked to ban someone.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user to ban'),
				reason: z.string().optional().describe('Reason for the ban'),
				deleteMessageDays: z.number().min(0).max(7).optional().describe('Number of days of messages to delete (0-7)')
			}),
			execute: async ({ userId, reason, deleteMessageDays }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					await member.ban({
						reason: reason || 'No reason provided',
						deleteMessageSeconds: deleteMessageDays ? deleteMessageDays * 24 * 60 * 60 : 0
					});
					return `✅ Successfully banned ${member.user.tag} (${userId}). Reason: ${reason || 'None'}`;
				} catch (error) {
					return `❌ Failed to ban user: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Kick a member from the guild
		 */
		kickMember: tool({
			description: 'Kick a member from the Discord server. Use this when asked to kick someone.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user to kick'),
				reason: z.string().optional().describe('Reason for the kick')
			}),
			execute: async ({ userId, reason }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					await member.kick(reason || 'No reason provided');
					return `✅ Successfully kicked ${member.user.tag} (${userId}). Reason: ${reason || 'None'}`;
				} catch (error) {
					return `❌ Failed to kick user: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Timeout (mute) a member
		 */
		timeoutMember: tool({
			description: 'Timeout (mute) a member for a specified duration. Use this when asked to mute or timeout someone.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user to timeout'),
				duration: z.number().describe('Duration in seconds (max 2419200 = 28 days)'),
				reason: z.string().optional().describe('Reason for the timeout')
			}),
			execute: async ({ userId, duration, reason }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					const durationMs = Math.min(duration * 1000, 28 * 24 * 60 * 60 * 1000); // Max 28 days
					await member.timeout(durationMs, reason || 'No reason provided');
					const durationStr = duration < 3600 ? `${Math.floor(duration / 60)} minutes` : `${Math.floor(duration / 3600)} hours`;
					return `✅ Successfully timed out ${member.user.tag} for ${durationStr}. Reason: ${reason || 'None'}`;
				} catch (error) {
					return `❌ Failed to timeout user: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Remove timeout from a member
		 */
		removeTimeout: tool({
			description: 'Remove timeout from a member (unmute). Use this when asked to unmute someone.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user to unmute')
			}),
			execute: async ({ userId }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					await member.timeout(null);
					return `✅ Successfully removed timeout from ${member.user.tag}`;
				} catch (error) {
					return `❌ Failed to remove timeout: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Add a role to a member
		 */
		addRole: tool({
			description: 'Add a role to a member. Use this when asked to give someone a role.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user'),
				roleId: z.string().describe('The ID of the role to add')
			}),
			execute: async ({ userId, roleId }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					const role = await context.guild.roles.fetch(roleId);
					if (!role) return '❌ Role not found';
					await member.roles.add(role);
					return `✅ Added role ${role.name} to ${member.user.tag}`;
				} catch (error) {
					return `❌ Failed to add role: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Remove a role from a member
		 */
		removeRole: tool({
			description: 'Remove a role from a member. Use this when asked to remove a role from someone.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user'),
				roleId: z.string().describe('The ID of the role to remove')
			}),
			execute: async ({ userId, roleId }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					const role = await context.guild.roles.fetch(roleId);
					if (!role) return '❌ Role not found';
					await member.roles.remove(role);
					return `✅ Removed role ${role.name} from ${member.user.tag}`;
				} catch (error) {
					return `❌ Failed to remove role: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Change a member's nickname
		 */
		setNickname: tool({
			description: "Change a member's nickname. Use this when asked to change someone's nickname or your own.",
			parameters: z.object({
				userId: z.string().describe('The ID of the user (use client.user.id for bot itself)'),
				nickname: z.string().describe('The new nickname (null to reset)')
			}),
			execute: async ({ userId, nickname }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					await member.setNickname(nickname || null);
					return `✅ Changed nickname of ${member.user.tag} to "${nickname || 'reset'}"`;
				} catch (error) {
					return `❌ Failed to change nickname: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Get information about a member
		 */
		getMemberInfo: tool({
			description: 'Get detailed information about a guild member. Use this when asked about user info, join date, roles, etc.',
			parameters: z.object({
				userId: z.string().describe('The ID of the user')
			}),
			execute: async ({ userId }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					const roles =
						member.roles.cache
							.map((r) => r.name)
							.filter((n) => n !== '@everyone')
							.join(', ') || 'None';
					const joinedAt = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown';
					const createdAt = new Date(member.user.createdAt).toLocaleDateString();

					return `**Member Info: ${member.user.tag}**
- ID: ${member.id}
- Nickname: ${member.nickname || 'None'}
- Joined Server: ${joinedAt}
- Account Created: ${createdAt}
- Roles: ${roles}
- Bot: ${member.user.bot ? 'Yes' : 'No'}
- Timeout: ${member.isCommunicationDisabled() ? 'Yes (until ' + member.communicationDisabledUntil?.toLocaleString() + ')' : 'No'}`;
				} catch (error) {
					return `❌ Failed to get member info: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		})
	};
}
