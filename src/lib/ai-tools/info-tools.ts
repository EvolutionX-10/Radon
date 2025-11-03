import { tool } from 'ai';
import { z } from 'zod';
import { ChannelType } from 'discord.js';
import type { AIToolContext } from './types.js';

/**
 * Tools for gathering information about the guild, members, and bot
 */
export function createInfoTools(context: AIToolContext) {
	return {
		/**
		 * Get server/guild information
		 */
		getServerInfo: tool({
			description: 'Get detailed information about the current Discord server/guild.',
			parameters: z.object({}),
			execute: async () => {
				try {
					const { guild } = context;

					const owner = await guild.fetchOwner();
					const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
					const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
					const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
					const roles = guild.roles.cache.size - 1; // Exclude @everyone
					const emojis = guild.emojis.cache.size;
					const stickers = guild.stickers.cache.size;
					const boostLevel = guild.premiumTier;
					const boostCount = guild.premiumSubscriptionCount || 0;

					return `**Server Info: ${guild.name}**
- ID: ${guild.id}
- Owner: ${owner.user.tag}
- Members: ${guild.memberCount}
- Created: ${new Date(guild.createdAt).toLocaleDateString()}

**Channels:**
- Text: ${textChannels}
- Voice: ${voiceChannels}
- Categories: ${categories}
- Total: ${guild.channels.cache.size}

**Other:**
- Roles: ${roles}
- Emojis: ${emojis}
- Stickers: ${stickers}
- Boost Level: ${boostLevel}
- Boosts: ${boostCount}
- Verification Level: ${guild.verificationLevel}
- Description: ${guild.description || 'None'}`;
				} catch (error) {
					return `❌ Failed to get server info: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Search for members by username
		 */
		searchMembers: tool({
			description: 'Search for members by username (fuzzy search). Use this when you need to find members by name.',
			parameters: z.object({
				query: z.string().describe('The username or partial username to search for'),
				limit: z.number().min(1).max(20).optional().describe('Maximum number of results to return (default 10)')
			}),
			execute: async ({ query, limit }) => {
				try {
					const results = await context.guild.members.search({
						query,
						limit: limit || 10
					});

					if (results.size === 0) {
						return `❌ No members found matching "${query}"`;
					}

					const memberList = Array.from(results.values())
						.map((m) => `- ${m.user.tag} (ID: ${m.id})${m.nickname ? ` [Nickname: ${m.nickname}]` : ''}`)
						.join('\n');

					return `**Members matching "${query}":**\n${memberList}`;
				} catch (error) {
					return `❌ Failed to search members: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Get bot information
		 */
		getBotInfo: tool({
			description: 'Get information about the bot itself (uptime, ping, stats).',
			parameters: z.object({}),
			execute: async () => {
				try {
					const { client } = context;
					const uptime = client.uptime ? Math.floor(client.uptime / 1000) : 0;
					const days = Math.floor(uptime / 86400);
					const hours = Math.floor((uptime % 86400) / 3600);
					const minutes = Math.floor((uptime % 3600) / 60);

					const uptimeStr = `${days}d ${hours}h ${minutes}m`;
					const ping = client.ws.ping;
					const guilds = client.guilds.cache.size;
					const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
					const channels = client.channels.cache.size;

					return `**Bot Info: ${client.user?.tag}**
- ID: ${client.user?.id}
- Uptime: ${uptimeStr}
- Ping: ${ping}ms
- Servers: ${guilds}
- Users: ${users}
- Channels: ${channels}
- Created: ${client.user?.createdAt ? new Date(client.user.createdAt).toLocaleDateString() : 'Unknown'}`;
				} catch (error) {
					return `❌ Failed to get bot info: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Get message history from a channel
		 */
		getMessageHistory: tool({
			description: 'Fetch recent messages from a channel. Use this when asked to see recent messages or chat history.',
			parameters: z.object({
				channelId: z.string().describe('The ID of the channel'),
				limit: z.number().min(1).max(100).optional().describe('Number of messages to fetch (max 100, default 10)')
			}),
			execute: async ({ channelId, limit }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) {
						return '❌ Channel not found or not a text channel';
					}

					if (!('messages' in channel)) {
						return '❌ Cannot access messages in this channel';
					}

					const messages = await channel.messages.fetch({ limit: limit || 10 });
					const messageList = Array.from(messages.values())
						.reverse()
						.map((m) => {
							const timestamp = new Date(m.createdAt).toLocaleTimeString();
							const content = m.content.substring(0, 100);
							const truncated = m.content.length > 100 ? '...' : '';
							return `[${timestamp}] ${m.author.tag}: ${content}${truncated}`;
						})
						.join('\n');

					return `**Recent messages in ${channel.name}:**\n${messageList || 'No messages found'}`;
				} catch (error) {
					return `❌ Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Find a channel by name
		 */
		findChannelByName: tool({
			description: 'Find a channel by name (case-insensitive partial match). Use this when you need to find a channel ID from its name.',
			parameters: z.object({
				name: z.string().describe('The name (or partial name) of the channel to find'),
				type: z.enum(['text', 'voice', 'category', 'any']).optional().describe('The type of channel to find')
			}),
			execute: async ({ name, type }) => {
				try {
					let channels = Array.from(context.guild.channels.cache.values());

					if (type && type !== 'any') {
						const typeMap = {
							text: ChannelType.GuildText,
							voice: ChannelType.GuildVoice,
							category: ChannelType.GuildCategory
						};
						channels = channels.filter((c) => c.type === typeMap[type]);
					}

					const channel = channels.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));

					if (!channel) {
						return `❌ No channel found matching "${name}"`;
					}

					return `✅ Found channel: ${channel.name} (ID: ${channel.id}, Type: ${ChannelType[channel.type]})`;
				} catch (error) {
					return `❌ Failed to find channel: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Find a member by username
		 */
		findMemberByName: tool({
			description: 'Find a member by username or nickname (fuzzy search). Use this when you need to find a member ID from their name.',
			parameters: z.object({
				name: z.string().describe('The username or nickname to search for')
			}),
			execute: async ({ name }) => {
				try {
					// Try exact match first
					let member = context.guild.members.cache.find(
						(m) => m.user.username.toLowerCase() === name.toLowerCase() || m.nickname?.toLowerCase() === name.toLowerCase()
					);

					// Try partial match
					if (!member) {
						member = context.guild.members.cache.find(
							(m) =>
								m.user.username.toLowerCase().includes(name.toLowerCase()) || m.nickname?.toLowerCase().includes(name.toLowerCase())
						);
					}

					// Try API search if not in cache
					if (!member) {
						const results = await context.guild.members.search({ query: name, limit: 1 });
						member = results.first();
					}

					if (!member) {
						return `❌ No member found matching "${name}". Try using searchMembers tool for multiple results.`;
					}

					return `✅ Found member: ${member.user.tag} (ID: ${member.id})${member.nickname ? ` [Nickname: ${member.nickname}]` : ''}`;
				} catch (error) {
					return `❌ Failed to find member: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		})
	};
}
