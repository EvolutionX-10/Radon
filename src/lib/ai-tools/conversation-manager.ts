import type { ConversationState, ConversationMessage } from './types.js';

/**
 * Manages conversation state for maintaining context across multiple interactions
 */
export class ConversationManager {
	private conversations = new Map<string, ConversationState>();
	private readonly maxMessages = 20; // Keep last 20 messages for context
	private readonly maxIdleTime = 30 * 60 * 1000; // 30 minutes

	/**
	 * Get or create conversation state for a user in a guild
	 */
	public getConversation(userId: string, guildId: string): ConversationState {
		const key = `${userId}:${guildId}`;
		let state = this.conversations.get(key);

		if (!state || Date.now() - state.lastInteraction > this.maxIdleTime) {
			state = {
				userId,
				guildId,
				messages: [],
				lastInteraction: Date.now()
			};
			this.conversations.set(key, state);
		}

		return state;
	}

	/**
	 * Add a message to the conversation history
	 */
	public addMessage(userId: string, guildId: string, role: ConversationMessage['role'], content: string): void {
		const state = this.getConversation(userId, guildId);
		state.messages.push({
			role,
			content,
			timestamp: Date.now()
		});

		// Keep only the most recent messages
		if (state.messages.length > this.maxMessages) {
			state.messages = state.messages.slice(-this.maxMessages);
		}

		state.lastInteraction = Date.now();
	}

	/**
	 * Clear conversation history for a user in a guild
	 */
	public clearConversation(userId: string, guildId: string): void {
		const key = `${userId}:${guildId}`;
		this.conversations.delete(key);
	}

	/**
	 * Get conversation history formatted for AI context
	 */
	public getHistory(userId: string, guildId: string): string {
		const state = this.getConversation(userId, guildId);
		if (state.messages.length === 0) return '';

		return state.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
	}

	/**
	 * Clean up old conversations (run periodically)
	 */
	public cleanup(): void {
		const now = Date.now();
		for (const [key, state] of this.conversations.entries()) {
			if (now - state.lastInteraction > this.maxIdleTime) {
				this.conversations.delete(key);
			}
		}
	}
}

// Global conversation manager instance
export const conversationManager = new ConversationManager();

// Run cleanup every 10 minutes
setInterval(() => conversationManager.cleanup(), 10 * 60 * 1000);
