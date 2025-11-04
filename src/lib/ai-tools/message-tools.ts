import { tool } from 'ai';
import { z } from 'zod';
import type { AIToolContext } from './types.js';

/**
 * Tools for sending and managing messages
 */
export function createMessageTools(context: AIToolContext) {
	return {
		/**
		 * Send a direct message to a user
		 */
		sendDM: tool({
			description: 'Send a direct message to a user. Use this when asked to DM someone.',
			inputSchema: z.object({
				userId: z.string().describe('The ID of the user to send a DM to'),
				message: z.string().describe('The message content to send')
			}),
			execute: async ({ userId, message }) => {
				try {
					const member = await context.guild.members.fetch(userId);
					await member.send(message);
					return `✅ Successfully sent DM to ${member.user.tag}`;
				} catch (error) {
					if (error instanceof Error && error.message.includes('Cannot send messages to this user')) {
						return `❌ Cannot send DM to user - they may have DMs disabled or blocked the bot`;
					}
					return `❌ Failed to send DM: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Send a message to a channel
		 */
		sendMessage: tool({
			description: 'Send a message to a specific channel. Use this when asked to send a message somewhere.',
			inputSchema: z.object({
				channelId: z.string().describe('The ID of the channel to send message to'),
				message: z.string().describe('The message content to send')
			}),
			execute: async ({ channelId, message }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) {
						return '❌ Channel not found or not a text channel';
					}

					if ('send' in channel && typeof channel.send === 'function') {
						await channel.send(message);
					} else {
						return '❌ Cannot send messages to this channel';
					}
					return `✅ Successfully sent message to ${channel.name}`;
				} catch (error) {
					return `❌ Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Delete messages from a channel
		 */
		bulkDeleteMessages: tool({
			description: 'Delete multiple messages from a channel (bulk delete). Use this when asked to clear or purge messages.',
			inputSchema: z.object({
				channelId: z.string().describe('The ID of the channel'),
				amount: z.number().min(1).max(100).describe('Number of messages to delete (1-100)')
			}),
			execute: async ({ channelId, amount }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) {
						return '❌ Channel not found or not a text channel';
					}

					if ('bulkDelete' in channel && typeof channel.bulkDelete === 'function') {
						const deleted = await channel.bulkDelete(amount, true);
						return `✅ Successfully deleted ${deleted.size} messages from ${channel.name}`;
					}

					return '❌ Cannot bulk delete messages in this channel';
				} catch (error) {
					return `❌ Failed to delete messages: ${error instanceof Error ? error.message : 'Unknown error'}. Note: Messages older than 14 days cannot be bulk deleted.`;
				}
			}
		}),

		/**
		 * Pin a message
		 */
		pinMessage: tool({
			description: 'Pin a message in a channel. Use this when asked to pin a message.',
			inputSchema: z.object({
				channelId: z.string().describe('The ID of the channel'),
				messageId: z.string().describe('The ID of the message to pin')
			}),
			execute: async ({ channelId, messageId }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) {
						return '❌ Channel not found or not a text channel';
					}

					if (!('messages' in channel)) {
						return '❌ Cannot access messages in this channel';
					}

					const message = await channel.messages.fetch(messageId);
					await message.pin();
					return `✅ Successfully pinned message in ${channel.name}`;
				} catch (error) {
					return `❌ Failed to pin message: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * Unpin a message
		 */
		unpinMessage: tool({
			description: 'Unpin a message in a channel. Use this when asked to unpin a message.',
			inputSchema: z.object({
				channelId: z.string().describe('The ID of the channel'),
				messageId: z.string().describe('The ID of the message to unpin')
			}),
			execute: async ({ channelId, messageId }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) {
						return '❌ Channel not found or not a text channel';
					}

					if (!('messages' in channel)) {
						return '❌ Cannot access messages in this channel';
					}

					const message = await channel.messages.fetch(messageId);
					await message.unpin();
					return `✅ Successfully unpinned message in ${channel.name}`;
				} catch (error) {
					return `❌ Failed to unpin message: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		}),

		/**
		 * React to a message
		 */
		reactToMessage: tool({
			description: 'Add a reaction to a message. Use this when asked to react to a message.',
			inputSchema: z.object({
				channelId: z.string().describe('The ID of the channel'),
				messageId: z.string().describe('The ID of the message to react to'),
				emoji: z.string().describe('The emoji to react with (Unicode emoji or custom emoji ID)')
			}),
			execute: async ({ channelId, messageId, emoji }) => {
				try {
					const channel = await context.guild.channels.fetch(channelId);
					if (!channel || !channel.isTextBased()) {
						return '❌ Channel not found or not a text channel';
					}

					if (!('messages' in channel)) {
						return '❌ Cannot access messages in this channel';
					}

					const message = await channel.messages.fetch(messageId);
					await message.react(emoji);
					return `✅ Successfully reacted to message with ${emoji}`;
				} catch (error) {
					return `❌ Failed to react to message: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		})
	};
}
