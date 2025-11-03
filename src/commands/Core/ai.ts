import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createAllTools, conversationManager, discordDocs, type AIToolContext } from '#lib/ai-tools';
import type { TextChannel } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	quotes: [],
	permissionLevel: PermissionLevels.BotOwner,
	flags: ['clear', 'reset'],
	description: 'Talk with Radon AI - An intelligent Discord assistant that understands Discord operations',
	detailedDescription: [
		'Radon AI is an advanced Discord assistant that can:',
		'- Answer questions about your server, members, channels, and roles',
		'- Execute Discord operations like banning, kicking, creating channels/roles',
		'- Provide server statistics and information',
		'- Manage messages, permissions, and more',
		'- Maintain conversation context for natural interactions',
		'',
		'Use --clear or --reset flag to clear conversation history'
	].join('\n'),
	guarded: true
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		// Check for clear/reset flags
		if (args.getFlags('clear', 'reset')) {
			conversationManager.clearConversation(message.author.id, message.guildId!);
			return void send(message, '✅ Conversation history cleared. Starting fresh!');
		}

		let naturalLanguageRequest: string;

		// Handle message references for context
		if (args.getFlags('this') && message.reference?.messageId) {
			const msg = await message.channel.messages.fetch(message.reference.messageId);
			naturalLanguageRequest = msg.content;
		} else if (message.reference?.messageId) {
			const msg = await message.channel.messages.fetch(message.reference.messageId);
			naturalLanguageRequest = (await args.rest('string')).concat(`\n\nContext: ${msg.content}`);
		} else {
			naturalLanguageRequest = await args.rest('string').catch(() => '');
		}

		if (!naturalLanguageRequest.length) {
			return void send(
				message,
				'Hey! What would you like me to do? You can ask me about the server, manage members, create channels, or just chat!'
			);
		}

		await send(message, '🤔 Thinking...');

		try {
			const result = await this.chat(naturalLanguageRequest, message);

			if (!result || !result.trim().length) {
				return void send(
					message,
					"❌ I couldn't generate a response. Could you rephrase that or be more specific about what you need?"
				);
			}

			// Split long responses
			if (result.length > 2000) {
				const chunks = this.splitMessage(result, 2000);
				await send(message, chunks[0]);
				for (let i = 1; i < chunks.length; i++) {
					await message.channel.send(chunks[i]);
				}
			} else {
				await send(message, result);
			}
		} catch (error) {
			console.error('AI Command Error:', error);
			const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
			return void send(message, `❌ An error occurred: ${errorMsg}`);
		}
	}

	/**
	 * Split long messages into chunks
	 */
	private splitMessage(text: string, maxLength: number): string[] {
		const chunks: string[] = [];
		let currentChunk = '';

		const lines = text.split('\n');
		for (const line of lines) {
			if (currentChunk.length + line.length + 1 > maxLength) {
				if (currentChunk) chunks.push(currentChunk);
				currentChunk = line;
			} else {
				currentChunk += (currentChunk ? '\n' : '') + line;
			}
		}

		if (currentChunk) chunks.push(currentChunk);
		return chunks;
	}

	/**
	 * Main chat handler with conversation context and specialized tools
	 */
	private async chat(chatMessage: string, message: RadonCommand.Message): Promise<string> {
		if (!message.guild) {
			return '❌ This command can only be used in a server, not in DMs.';
		}

		const { guild, author } = message;
		const channel = message.channel as TextChannel;

		// Build AI tool context
		const toolContext: AIToolContext = {
			message,
			guild,
			channel,
			member: message.member!,
			client: message.client,
			container: this.container
		};

		// Get conversation history
		const history = conversationManager.getHistory(author.id, guild.id);

		// Add user message to history
		conversationManager.addMessage(author.id, guild.id, 'user', chatMessage);

		// Fetch relevant Discord.js documentation
		const relevantEntities = discordDocs.detectRelevantEntities(chatMessage);
		const docsSummary = await discordDocs.getEntityDocs(relevantEntities);

		// Build comprehensive system prompt
		const systemPrompt = this.buildSystemPrompt(message, docsSummary, history);

		try {
			// Create all specialized tools
			const tools = createAllTools(toolContext);

			const { text } = await generateText({
				model: google('gemini-2.0-flash-exp'),
				system: systemPrompt,
				prompt: chatMessage,
				temperature: 0.2,
				maxTokens: 4000,
				maxSteps: 10,
				tools
			});

			// Add assistant response to history
			conversationManager.addMessage(author.id, guild.id, 'assistant', text);

			return text.trim();
		} catch (error) {
			console.error('Error in chat generation:', error);
			throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Build comprehensive system prompt with context and documentation
	 */
	private buildSystemPrompt(message: RadonCommand.Message, docsSummary: string, history: string): string {
		const guild = message.guild!;
		const channel = message.channel as TextChannel;
		const member = message.member!;

		const botUser = this.container.client.user;
		const botMember = guild.members.cache.get(botUser?.id || '');

		return `You are Radon, an advanced Discord bot AI assistant with deep knowledge of Discord operations and server management. You're currently helping ${member.user.tag} in the server "${guild.name}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 YOUR PERSONALITY & ROLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are not just a bot - you are an intelligent, knowledgeable member of this Discord server. Act like a Discord veteran who:
- Understands Discord culture, terminology, and best practices
- Is friendly, helpful, and conversational (not robotic)
- Can explain Discord concepts in simple terms
- Has extensive experience with server management, moderation, and community building
- Knows when to be professional and when to be casual
- Asks clarifying questions when needed instead of guessing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 CURRENT CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server: ${guild.name} (${guild.memberCount} members)
Channel: #${channel.name}
User: ${member.user.tag} (${member.user.id})
Bot: ${botUser?.tag || 'Radon'} (Your name is Radon)
Bot Member ID: ${botMember?.id || botUser?.id || 'unknown'} (IMPORTANT: Use this ID when referring to yourself)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ YOUR CAPABILITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have access to specialized tools for:

**Member Management:**
- Ban, kick, timeout (mute) members
- Add/remove roles from members
- Change nicknames (including your own)
- Get detailed member information
- Search for members by username

**Channel Management:**
- Create, delete, rename channels (text, voice, categories, etc.)
- Set channel slowmode
- Create invites
- Get channel information
- List all channels
- Find channels by name

**Role Management:**
- Create, delete, edit roles
- Set role permissions
- Get role information
- List all roles
- Find roles by name

**Information Gathering:**
- Get server statistics and information
- Search for members
- Get bot stats (uptime, ping, etc.)
- View message history
- Find channels and members by name

**Message Operations:**
- Send DMs to users
- Send messages to channels
- Bulk delete messages
- Pin/unpin messages
- React to messages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DISCORD.JS v14 DOCUMENTATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${docsSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 CONVERSATION HISTORY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${history || 'No previous conversation history.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 IMPORTANT GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **Use Tools When Needed**: When the user asks you to DO something (not just answer), use the appropriate tool.
2. **Be Conversational**: Don't just execute tasks - explain what you're doing in a friendly way.
3. **Ask for Clarification**: If a request is ambiguous or you need more info (like a user ID), ask!
4. **Find IDs When Needed**: Use findMemberByName, findChannelByName, findRoleByName tools to resolve names to IDs before using other tools.
5. **Safety First**: Be cautious with destructive operations (bans, deletes). Confirm understanding and explain impact.
6. **Provide Context**: When sharing information, make it readable and well-formatted.
7. **Handle Errors Gracefully**: If a tool fails, explain what went wrong in a helpful way.
8. **Be Aware of Yourself**: When changing your own nickname, use YOUR member ID (${botMember?.id || botUser?.id || 'the bot ID'}), not the user's ID.
9. **Understand Discord Terms**: Know what slowmode, timeouts, hoisting, permissions, categories, etc. mean.
10. **Stay in Character**: You're a helpful, experienced Discord community member, not a generic AI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 EXAMPLES OF GOOD RESPONSES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "Ban user#1234"
Bad: *just uses banMember tool*
Good: "Sure! Let me find and ban that user. [uses findMemberByName, then banMember] ✅ I've banned user#1234. They won't be able to rejoin unless unbanned."

User: "What's the server like?"
Bad: *uses getServerInfo and dumps raw data*
Good: "Let me check! [uses getServerInfo] You've got a nice community here - ${guild.memberCount} members across [X] channels. The server was created [date] and has [boost level] boost status. Want me to get more specific stats?"

User: "Change my nickname to 'CoolDude'"
Bad: *changes user's nickname*
Good: "Just to clarify - do you want me to change YOUR nickname or MY nickname? If you want to change your own nickname, you can do that yourself in the server settings. But I can change MY nickname if you'd like!"

Remember: Be helpful, conversational, and smart about Discord operations!`;
	}
}
