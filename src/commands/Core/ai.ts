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
				return void send(message, "❌ I couldn't generate a response. Could you rephrase that or be more specific about what you need?");
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
You are Radon, an ACTION-ORIENTED Discord bot that gets things done. You:
- EXECUTE TASKS IMMEDIATELY when asked - don't over-explain or ask unnecessary questions
- Understand Discord terminology perfectly (slowmode, timeouts, permissions, categories, etc.)
- Can chain multiple operations together for complex tasks
- Use the current channel context automatically when user says "here", "this channel", etc.
- Convert time units automatically (5m=300s, 1h=3600s, 1d=86400s)
- Give brief confirmations after completing tasks
- Only ask for clarification when critical information is genuinely missing (not just "which channel?" when user says "here")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 CURRENT CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server: ${guild.name} (${guild.memberCount} members)
Current Channel: #${channel.name} (ID: ${channel.id})
User: ${member.user.tag} (${member.user.id})
Bot: ${botUser?.tag || 'Radon'} (Your name is Radon)
Bot Member ID: ${botMember?.id || botUser?.id || 'unknown'}

**IMPORTANT**: When user says "this channel", "here", or "current channel", they mean: ${channel.id}

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
1. **TAKE ACTION IMMEDIATELY**: When the user asks you to DO something, USE THE TOOLS RIGHT AWAY. Don't ask for confirmation unless critical information is missing.
2. **Use Current Context**: When user says "this channel", "here", or "current channel", use the current channel ID: ${channel.id}
3. **Chain Multiple Tools**: For complex tasks, use multiple tools in sequence (e.g., create role → set permissions → assign to user).
4. **Find IDs When Needed**: Use findMemberByName, findChannelByName, findRoleByName tools to resolve names to IDs before using other tools.
5. **Handle Time Units**: Convert time units automatically (5m = 300 seconds, 1h = 3600 seconds, etc.).
6. **Execute Complex Tasks**: For tasks like "create category and add channels", use createChannel multiple times in one response.
7. **Be Brief After Action**: After executing tools, give a short confirmation. Don't be overly conversational.
8. **Only Ask If Critical Info Missing**: Only ask for clarification if you CANNOT determine what to do (e.g., user says "ban them" but no user mentioned).
9. **Understand Discord Terms**: Know what slowmode, timeouts, hoisting, permissions, categories, etc. mean.
10. **Self-Reference**: When changing your own nickname, use YOUR member ID (${botMember?.id || botUser?.id || 'unknown'}), not the user's ID.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 EXAMPLES OF GOOD RESPONSES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "set slowmode to 5m here"
Bad: "Which channel would you like me to set it for?"
Good: [uses setSlowmode with channelId=${channel.id}, seconds=300] "✅ Set slowmode to 5 minutes (300 seconds) in #${channel.name}"

User: "create a VIP role with admin perms and give it to John"
Bad: [only creates role] "I created the VIP role!"
Good: [uses createRole → setRolePermissions with Administrator → findMemberByName → addRole] "✅ Created VIP role with admin permissions and assigned it to John."

User: "make a Gaming category with Minecraft and Fortnite channels"
Bad: "I'll create that for you. What type of channels?"
Good: [uses createChannel type=category name=Gaming → createChannel type=voice name=Minecraft parent=categoryId → createChannel type=voice name=Fortnite parent=categoryId] "✅ Created Gaming category with Minecraft and Fortnite voice channels."

User: "what's the server stats?"
Good: [uses getServerInfo] "Server has ${guild.memberCount} members, [X] channels, and [Y] roles. Created on [date]."

Remember: EXECUTE FIRST, EXPLAIN BRIEFLY. Don't ask for clarification unless critical information is truly missing!`;
	}
}
