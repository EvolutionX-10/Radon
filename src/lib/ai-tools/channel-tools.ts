import { tool } from 'ai';
import { z } from 'zod';
import { ChannelType } from 'discord.js';
import type { AIToolContext } from './types.js';

/**
 * Tools for managing channels
 */
export function createChannelTools(context: AIToolContext) {
	return {
		/**
		 * Create a new channel
		 */
		createChannel: tool({
			description: 'Create a new channel in the guild. Use this when asked to create a channel.',
			parameters: z.object({
				name: z.string().describe('The name of the channel'),
				type: z.enum(['text', 'voice', 'announcement', 'stage', 'forum', 'category']).describe('The type of channel to create'),
				topic: z.string().optional().describe('The topic/description of the channel'),
				categoryId: z.string().optional().describe('ID of the parent category')
			}),
			execute: async ({ name, type, topic, categoryId }) => {
				try {
					const channelTypeMap: Record<string, ChannelType> = {
						text: ChannelType.GuildText,
						voice: ChannelType.GuildVoice,
						announcement: ChannelType.GuildAnnouncement,
						stage: ChannelType.GuildStageVoice,
						forum: ChannelType.GuildForum,
						category: ChannelType.GuildCategory
					};

					const channelOptions: any = {
						name,
						type: channelTypeMap[type]
					};

					if (topic) channelOptions.topic = topic;
					if (categoryId) channelOptions.parent = categoryId;

					const channel = await context.guild.channels.create(channelOptions);

					return `✅ Successfully created ${type} channel: ${channel.name} (ID: ${channel.id})`;
				} catch (error) {
					return `❌ Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Delete a channel
		 */
		deleteChannel: tool({
			description: 'Delete a channel from the guild. Use this when asked to delete or remove a channel.',
			parameters: z.object({
				channelId: z.string().describe('The ID of the channel to delete')
			}),
			execute: async ({ channelId }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel) return '❌ Channel not found';
					const channelName = channel.name;
					await channel.delete();
					return `✅ Successfully deleted channel: ${channelName}`;
				} catch (error) {
					return `❌ Failed to delete channel: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Rename a channel
		 */
		renameChannel: tool({
			description: 'Rename a channel. Use this when asked to change a channel name.',
			parameters: z.object({
				channelId: z.string().describe('The ID of the channel to rename'),
				newName: z.string().describe('The new name for the channel')
			}),
			execute: async ({ channelId, newName }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel) return '❌ Channel not found';
					const oldName = channel.name;
					await channel.setName(newName);
					return `✅ Successfully renamed channel from "${oldName}" to "${newName}"`;
				} catch (error) {
					return `❌ Failed to rename channel: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Set channel slowmode
		 */
		setSlowmode: tool({
			description: 'Set slowmode for a text channel. Use this when asked to enable/disable slowmode.',
			parameters: z.object({
				channelId: z.string().describe('The ID of the channel'),
				seconds: z.number().min(0).max(21600).describe('Slowmode duration in seconds (0 to disable, max 21600)')
			}),
			execute: async ({ channelId, seconds }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) return '❌ Channel not found or not a text channel';

					if ('setRateLimitPerUser' in channel && typeof channel.setRateLimitPerUser === 'function') {
						await channel.setRateLimitPerUser(seconds);
					} else {
						return '❌ This channel does not support slowmode';
					}
					if (seconds === 0) {
						return `✅ Disabled slowmode for ${channel.name}`;
					} else {
						return `✅ Set slowmode for ${channel.name} to ${seconds} seconds`;
					}
				} catch (error) {
					return `❌ Failed to set slowmode: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Get channel information
		 */
		getChannelInfo: tool({
			description: 'Get information about a channel. Use this when asked about channel details.',
			parameters: z.object({
				channelId: z.string().describe('The ID of the channel')
			}),
			execute: async ({ channelId }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel) return '❌ Channel not found';

					let info = `**Channel Info: ${channel.name}**\n- ID: ${channel.id}\n- Type: ${ChannelType[channel.type]}`;

					if (channel.isTextBased() && 'topic' in channel) {
						const topic = 'topic' in channel ? channel.topic : null;
						const rateLimitPerUser = 'rateLimitPerUser' in channel ? channel.rateLimitPerUser : 0;
						info += `\n- Topic: ${topic || 'None'}`;
						info += `\n- Slowmode: ${rateLimitPerUser || 0} seconds`;
					}

					if (channel.parent) {
						info += `\n- Category: ${channel.parent.name}`;
					}

					if ('position' in channel) {
						info += `\n- Position: ${channel.position}`;
					}
					info += `\n- Created: ${channel.createdAt ? new Date(channel.createdAt).toLocaleDateString() : 'Unknown'}`;

					return info;
				} catch (error) {
					return `❌ Failed to get channel info: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * List all channels in the guild
		 */
		listChannels: tool({
			description: 'List all channels in the guild by type. Use this when asked to list channels.',
			parameters: z.object({
				type: z.enum(['all', 'text', 'voice', 'category']).optional().describe('Filter by channel type')
			}),
			execute: async ({ type }) => {
				try {
					let channels = Array.from(context.guild.channels.cache.values());

					if (type && type !== 'all') {
						const typeMap: Record<string, ChannelType> = {
							text: ChannelType.GuildText,
							voice: ChannelType.GuildVoice,
							category: ChannelType.GuildCategory
						};
						channels = channels.filter((c) => c.type === typeMap[type]);
					}

					channels.sort((a, b) => {
						const aPos = 'position' in a ? (a.position as number) : 0;
						const bPos = 'position' in b ? (b.position as number) : 0;
						return aPos - bPos;
					});

					const channelList = channels.map((c) => `- ${c.name} (ID: ${c.id}, Type: ${ChannelType[c.type]})`).join('\n');

					return `**Channels in ${context.guild.name}:**\n${channelList || 'No channels found'}`;
				} catch (error) {
					return `❌ Failed to list channels: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Create an invite for a channel
		 */
		createInvite: tool({
			description: 'Create an invite link for a channel. Use this when asked to create an invite.',
			parameters: z.object({
				channelId: z.string().describe('The ID of the channel'),
				maxAge: z.number().optional().describe('Max age in seconds (0 for permanent)'),
				maxUses: z.number().optional().describe('Max number of uses (0 for unlimited)')
			}),
			execute: async ({ channelId, maxAge, maxUses }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !('createInvite' in channel) || typeof channel.createInvite !== 'function') {
						return '❌ Cannot create invite for this channel type';
					}

					const invite = await channel.createInvite({
						maxAge: maxAge || 0,
						maxUses: maxUses || 0
					});

					return `✅ Created invite: ${invite.url}\n- Max Age: ${maxAge || 'Permanent'}\n- Max Uses: ${maxUses || 'Unlimited'}`;
				} catch (error) {
					return `❌ Failed to create invite: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		})
	};
}
