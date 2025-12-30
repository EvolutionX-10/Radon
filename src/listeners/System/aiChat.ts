import { Emojis, Prefixes } from '#constants';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { Owners } from '#constants';

export class UserListener extends Listener {
	private readonly ownerIds: string[] = Owners;
	private readonly responseChance = 0.05; // 5% chance to respond to non-targeted messages
	private readonly conversationHistory = new Map<string, Array<{ role: 'user' | 'assistant'; content: string; author?: string }>>();
	private readonly cooldowns = new Map<string, number>(); // userId -> timestamp
	private readonly multiMessageWindow = 2000; // 2 seconds to detect rapid messages
	private readonly processingMessages = new Set<string>(); // Track messages being processed
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, {
			...options,
			event: 'messageCreate'
		});
	}

	public override async run(message: Message) {
		// Ignore bots and self
		if (message.author.bot || !message.guild) return;
		if (!message.channel.isSendable()) return;

		// Check if AI chat is enabled for this channel
		const config = await this.container.prisma.aiChatConfig.findUnique({
			where: { id: message.channelId }
		});

		if (!config || !config.enabled) return;

		// Check if user is targeted (if targeting is set)
		if (config.targetUserIds.length > 0 && !config.targetUserIds.includes(message.author.id)) {
			// Still respond if bot is mentioned, replied to, or name is mentioned
			const isMentioned = message.mentions.has(this.container.client.user!.id);
			const isReplyToBot = await this.isReplyToBot(message);
			const botName = this.container.client.user?.username.toLowerCase() || 'radon';
			const botMember = await message.guild?.members.fetch(this.container.client.user!.id).catch(() => null);
			const nickname = botMember?.nickname?.toLowerCase();
			const messageContent = message.content.toLowerCase();

			const namesMentioned = messageContent.includes(botName) || (nickname && messageContent.includes(nickname));

			if (!isMentioned && !isReplyToBot && !namesMentioned) return;
		}

		// Ignore if message is a command
		if (Prefixes.some((prefix) => message.content.startsWith(prefix))) return;

		// Ignore emoji-only or reaction messages (like 😂, 💀, kek emojis)
		if (this.isEmojiOnlyMessage(message.content)) return;

		// Check cooldown (but allow owner to bypass)
		if (!this.ownerIds.includes(message.author.id)) {
			const lastResponse = this.cooldowns.get(message.author.id);
			if (lastResponse) {
				// Random cooldown between 5-10 seconds
				const randomCooldown = 5000 + Math.random() * 5000;
				if (Date.now() - lastResponse < randomCooldown) {
					return;
				}
			}
		}

		// Determine if we should respond
		const shouldRespond = await this.shouldRespond(message, config);
		if (!shouldRespond) return;

		// Check if user is sending multiple messages rapidly (broken text)
		const combinedMessage = await this.detectAndCombineRapidMessages(message);

		// If this message is part of a sequence and not the last one, skip it
		if (!combinedMessage) return;

		// Set cooldown
		this.cooldowns.set(message.author.id, Date.now());

		try {
			// Fetch recent messages for context
			const recentMessages = await this.fetchRecentMessages(message);

			// Generate response (use combined message if available)
			const response = await this.generateResponse(
				message,
				config,
				recentMessages,
				combinedMessage !== message.content ? combinedMessage : undefined
			);

			if (response && response.trim().length > 0) {
				// Calculate typing duration based on response length (simulate human typing)
				// Average human typing speed: 40-60 WPM, let's use 50 WPM = ~4 characters per second
				// Add some randomness to make it more natural
				const baseTypingSpeed = 4; // characters per second
				const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3 multiplier
				const typingDuration = Math.min(
					(response.length / baseTypingSpeed) * 1000 * randomFactor,
					8000 // Cap at 8 seconds max
				);
				const minTypingDuration = 1000; // At least 1 second
				const finalTypingDuration = Math.max(typingDuration, minTypingDuration);

				// Show typing indicator and wait
				if (message.channel.isSendable()) {
					await message.channel.sendTyping();
					await new Promise((resolve) => setTimeout(resolve, finalTypingDuration));
				}

				// Update conversation history
				this.updateHistory(message.channelId, 'user', combinedMessage, message.member!.displayName);
				this.updateHistory(message.channelId, 'assistant', response);

				// Decide whether to reply or just send
				// Reply if: user is targeted, bot was mentioned, message was a reply to bot, or directly addressing the user
				const shouldReply = this.shouldReplyToMessage(message, config, response);

				if (shouldReply) {
					await message.reply({
						content: response,
						allowedMentions: { repliedUser: true }
					});
				} else {
					await message.channel.send(response);
				}
			}
		} catch (error) {
			this.container.logger.error('[AI Chat]', error);
		}
	}

	private async shouldRespond(message: Message, config: any): Promise<boolean> {
		// Always respond if bot is mentioned
		if (message.mentions.has(this.container.client.user!.id)) {
			return true;
		}

		// Always respond if bot name is mentioned in the message
		const botName = 'beru';
		if (message.content.toLowerCase().includes(botName)) {
			return true;
		}

		// Always respond to targeted users
		if (config.targetUserIds.includes(message.author.id)) {
			return true;
		}

		// Reply if message is a reply to the bot
		if (await this.isReplyToBot(message)) {
			return true;
		}

		// Otherwise, respond randomly based on chance
		return Math.random() < this.responseChance;
	}

	private async isReplyToBot(message: Message): Promise<boolean> {
		if (!message.reference?.messageId) return false;

		try {
			const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
			return repliedMessage.author.id === this.container.client.user!.id;
		} catch {
			return false;
		}
	}

	private isEmojiOnlyMessage(content: string): boolean {
		// Remove all Unicode emojis, Discord custom emojis, and whitespace
		const withoutEmojis = content
			.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '') // Discord custom emojis
			.replace(
				/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FAD0}-\u{1FAD9}]/gu,
				''
			) // Unicode emojis
			.trim();

		return withoutEmojis.length === 0;
	}

	private async detectAndCombineRapidMessages(message: Message): Promise<string | null> {
		const messageKey = `${message.channelId}-${message.author.id}`;

		// Prevent processing the same message multiple times
		if (this.processingMessages.has(messageKey)) {
			return null;
		}

		try {
			// Fetch recent messages from this channel
			const recentMessages = await message.channel.messages.fetch({ limit: 10, before: message.id });
			const messagesArray = Array.from(recentMessages.values());

			// Find consecutive messages from the same user within the time window
			const rapidMessages: Message[] = [message]; // Start with current message
			const currentTime = message.createdTimestamp;

			for (const msg of messagesArray) {
				// Only consider messages from the same author
				if (msg.author.id !== message.author.id) break;

				// Check if within time window
				const timeDiff = currentTime - msg.createdTimestamp;
				if (timeDiff > this.multiMessageWindow) break;

				// Don't include emoji-only messages in combination
				if (!this.isEmojiOnlyMessage(msg.content)) {
					rapidMessages.unshift(msg); // Add to beginning (chronological order)
				}
			}

			// If we found multiple rapid messages, wait a bit to see if more are coming
			if (rapidMessages.length > 1) {
				this.processingMessages.add(messageKey);

				// Wait 1 second to see if user is still typing
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Check if a newer message arrived from this user
				const newestMessages = await message.channel.messages.fetch({ limit: 1 });
				const newestMessage = newestMessages.first();

				// If a newer message from the same user exists, skip this one
				if (
					newestMessage &&
					newestMessage.author.id === message.author.id &&
					newestMessage.id !== message.id &&
					newestMessage.createdTimestamp > message.createdTimestamp
				) {
					this.processingMessages.delete(messageKey);
					return null; // Let the newer message handle the response
				}

				// Combine the messages
				const combined = rapidMessages.map((m) => m.content).join(' ');
				this.processingMessages.delete(messageKey);
				return combined;
			}

			// Single message, return as-is
			return message.content;
		} catch (error) {
			this.container.logger.error('[AI Chat] Error detecting rapid messages:', error);
			return message.content;
		}
	}

	private shouldReplyToMessage(message: Message, config: any, response: string): boolean {
		// Always reply if user is targeted
		if (config.targetUserIds.includes(message.author.id)) {
			return true;
		}

		// Always reply if bot was mentioned
		if (message.mentions.has(this.container.client.user!.id)) {
			return true;
		}

		// Always reply if it's a reply to the bot
		if (message.reference?.messageId) {
			return true;
		}

		// Reply if the response seems to be directly addressing the user
		// (contains question marks, starts with addressing them, etc.)
		const lowerResponse = response.toLowerCase();
		const lowerUsername = message.member!.displayName.toLowerCase();

		// Check if response mentions the user or seems like a direct answer
		if (
			lowerResponse.includes(lowerUsername) ||
			lowerResponse.startsWith('you ') ||
			lowerResponse.includes(' you ') ||
			response.includes('?') // Asking them a question
		) {
			return true;
		}

		// Otherwise, just send normally (joining the conversation)
		return false;
	}

	private async fetchRecentMessages(message: Message): Promise<Message[]> {
		try {
			const messages = await message.channel.messages.fetch({ limit: 10, before: message.id });
			return Array.from(messages.values()).reverse();
		} catch {
			return [];
		}
	}

	private async generateResponse(message: Message, config: any, recentMessages: Message[], overrideContent?: string): Promise<string> {
		const isOwner = this.ownerIds.includes(message.author.id);
		const botEmojis = this.getBotEmojis();
		const serverEmojis = this.getServerEmojis(message);

		// Build conversation context
		const conversationContext = this.buildConversationContext(recentMessages);

		// Get bot's nickname in the server
		const botMember = await message.guild?.members.fetch(this.container.client.user!.id);
		const botName = botMember?.nickname || this.container.client.user?.username || 'Radon';

		// Use override content if provided (for combined messages)
		const actualContent = overrideContent || message.content;

		const systemPrompt = `You are ${botName}, a Discord moderation bot with personality! You're chatting naturally in #${(message.channel as any).name} on ${message.guild?.name}.

PERSONALITY TRAITS:
- Witty, sarcastic, humorous, and fun - but ALWAYS respectful
- Use casual Discord language naturally (no forced formality)
- Be genuinely helpful when needed, but don't be a boring assistant
- Match the vibe of the conversation - be playful in casual chats, serious when needed
- Use emojis ONLY when they genuinely add to the message (don't spam them)
- Keep responses concise and natural - you're chatting, not writing essays

IMPORTANT RULES:
${isOwner ? '- This is YOUR CREATOR AND OWNER (Also called Evo). Be friendly, respectful, and treat them as a close friend. NEVER roast or be sarcastic toward them. You can be casual but always show respect for the hierarchy.' : '- You can be playfully sarcastic and roast others (within limits), but keep it fun and lighthearted.'}
- NEVER be offensive, hateful, or cross the line into genuine rudeness
- Don't respond to every single message - act human (this is already filtered, so DO respond now)
- Only use emojis when they genuinely fit - you're not an emoji bot
- Avoid repetitive responses or patterns - be dynamic and natural
- You're a bot, but act conversational - don't constantly remind people you're a bot

YOUR EMOJI VOCABULARY (use sparingly and appropriately):
${botEmojis}

SERVER EMOJIS AVAILABLE (PREFER THESE FIRST):
${serverEmojis}

EMOJI USAGE PREFERENCES:
- ALWAYS prefer server emojis over standard Unicode emojis when available
- For laughing/humor, use <:kekw:1370113179274706964> instead of 😂 or 🤣
- Use "kek" instead of "rofl" or "lol" for text reactions
- Use server emojis to match the server's culture and vibe
- Only fall back to standard emojis if no suitable server emoji exists

${config.motive ? `CURRENT MOTIVE/GOAL: ${config.motive}\n(Keep this in mind but don't force it into every response)` : ''}

CONVERSATION CONTEXT:
${conversationContext}

RESPONSE GUIDELINES:
- Keep it natural and conversational
- 1-3 sentences usually (unless the context demands more)
- Don't always answer questions directly - sometimes react, joke, or deflect naturally
- Use Discord markdown when appropriate (**bold**, *italic*, \`code\`, etc.)
- React to the vibe: if chat is chaotic, match it; if serious, be helpful
- If someone's clearly asking for help, be genuinely helpful
- Don't end every message with a question - that's annoying

Current message author: ${message.author.username}${isOwner ? ' (YOUR OWNER - show respect!)' : ''}`;

		try {
			const { text } = await generateText({
				model: groq('llama-3.1-8b-instant'),
				system: systemPrompt,
				prompt: `${message.author.username}: ${actualContent}`,
				temperature: 0.9, // Higher temperature for more creative/varied responses
				maxOutputTokens: 300
			});

			return text.trim();
		} catch (error) {
			this.container.logger.error('[AI Chat] Generation error:', error);
			return ''; // Silently fail
		}
	}

	private buildConversationContext(recentMessages: Message[]): string {
		let context = 'Recent conversation:\n';

		// Add recent messages for context (last 5)
		const relevantMessages = recentMessages.slice(-5);

		if (relevantMessages.length === 0) {
			context += '(No recent messages - this is the start of the conversation)\n';
		} else {
			for (const msg of relevantMessages) {
				const author = msg.author.bot ? `${msg.author.username} (bot)` : msg.author.username;
				const content = msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content;
				context += `${author}: ${content}\n`;
			}
		}

		return context;
	}

	private getBotEmojis(): string {
		return `
- ${Emojis.Confirm} - For agreement, success, confirmation
- ${Emojis.Cross} - For disagreement, failure, denial
- ${Emojis.Owner} - When talking about ownership/admin stuff
- ${Emojis.Member} - When referring to members
- ${Emojis.Bot} - When referring to bots
- Standard Discord emojis (🤔, 👀, 💀, 🔥, ✨, etc.) - Use naturally, but PREFER server emojis

Remember: Less is more. Don't use emojis in every message.`;
	}

	private getServerEmojis(message: Message): string {
		if (!message.guild) return 'No server emojis available.';

		const emojis = message.guild.emojis.cache;
		if (emojis.size === 0) return 'No custom server emojis available.';

		// Limit to 20 most relevant emojis to avoid token bloat
		const emojiList = emojis
			.filter((emoji) => !emoji.animated) // Prefer static for simplicity
			.first(20)
			.map((emoji) => `- ${emoji.toString()} (:${emoji.name}:) - Use for ${emoji.name}-related reactions`)
			.join('\n');

		// Always include kekw if it exists
		const kekw = emojis.find((e) => e.id === '1370113179274706964');
		const kekwNote = kekw ? `\n\nIMPORTANT: <:kekw:1370113179274706964> is the preferred laughing emoji - use this instead of 😂` : '';

		return emojiList + kekwNote;
	}

	private updateHistory(channelId: string, role: 'user' | 'assistant', content: string, author?: string) {
		if (!this.conversationHistory.has(channelId)) {
			this.conversationHistory.set(channelId, []);
		}

		const history = this.conversationHistory.get(channelId)!;
		history.push({ role, content, author });

		// Keep only last 20 messages
		if (history.length > 20) {
			history.shift();
		}
	}
}
