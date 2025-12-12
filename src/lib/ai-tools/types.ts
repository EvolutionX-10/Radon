import type { RadonCommand } from '#lib/structures';
import type { Guild, GuildMember, TextChannel } from 'discord.js';

/**
 * Context provided to AI tools for executing Discord operations
 */
export interface AIToolContext {
	message: RadonCommand.Message;
	guild: Guild;
	channel: TextChannel;
	member: GuildMember;
	client: RadonCommand.Message['client'];
	container: RadonCommand['container'];
}

/**
 * Result from executing an AI tool
 */
export interface AIToolResult {
	success: boolean;
	message: string;
	data?: any;
}

/**
 * Conversation message for state management
 */
export interface ConversationMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
}

/**
 * Conversation state for maintaining context across messages
 */
export interface ConversationState {
	userId: string;
	guildId: string;
	messages: ConversationMessage[];
	lastInteraction: number;
}
