import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { clean } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Stopwatch } from '@sapphire/stopwatch';
import { isThenable } from '@sapphire/utilities';
import { inspect } from 'node:util';
import { groq } from '@ai-sdk/groq';
import { generateObject, generateText, tool } from 'ai';
import { z } from 'zod';

@ApplyOptions<RadonCommand.Options>({
	quotes: [],
	permissionLevel: PermissionLevels.BotOwner,
	flags: ['hidden', 'haste', 'silent', 's', 'v', 'value', 'this', 'stack', 'del', 'd', 'async'],
	options: ['depth'],
	description: 'Talk with AI',
	guarded: true
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		let naturalLanguageRequest: string;

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
			return void send(message, 'Please provide a natural language request for what you want to do.');
		}

		if (args.getFlags('d', 'del')) await message.delete().catch(() => null);

		await send(message, '🤔 Thinking...');

		try {
			const result = await this.chat(naturalLanguageRequest, message);
			console.log('AI Response:', result);

			if (!result || !result.trim().length) {
				return void send(message, '❌ No response generated from the AI. Please try rephrasing your request.');
			}

			// Edit the thinking message with the result
			return void send(message, result);
		} catch (error) {
			console.error('AI Command Error:', error);
			const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
			return void send(message, `❌ An error occurred while processing your request: ${errorMsg}`);
		}
	}
	private async chat(chatMessage: string, message: RadonCommand.Message): Promise<string> {
		const guildInfo = message.guild ? `in ${message.guild.name} (${message.guild.memberCount} members)` : 'in DMs';
		const channelInfo = message.guild ? `#${(message.channel as any).name || 'unknown-channel'}` : 'DM';

		const systemPrompt = `You are Radon, an intelligent Discord moderation bot assistant. You're talking to ${message.author.username} ${guildInfo} in ${channelInfo}.

PERSONALITY:
- Be helpful, professional, and knowledgeable about Discord bot operations
- Be concise but informative in your responses
- Stay focused on Discord and bot management topics
- When users ask you to perform actions, use the performDiscordTask tool
- For informational queries, provide helpful and accurate information

CAPABILITIES:
- Answer questions about Discord, bot features, and server management
- Execute Discord bot operations via code when requested
- Provide information about server stats, members, channels, etc.
- Help with moderation tasks like banning, kicking, timeouts
- Gather information about users, roles, permissions

IMPORTANT GUIDELINES:
- Always prioritize safety - be cautious with destructive operations
- Provide clear explanations of what actions will do
- If unsure about a request, ask for clarification
- For complex operations, break them down into steps

CONTEXT:
- Current server: ${message.guild?.name || 'Direct Messages'}
- Current channel: ${channelInfo}
- Your permissions: Administrator (you're a bot)
- Available database: Prisma ORM with guild settings and user data`;

		try {
			const { text } = await generateText({
				model: groq('qwen-qwq-32b'),
				system: systemPrompt,
				providerOptions: {
					groq: { reasoningFormat: 'hidden' }
				},
				prompt: `${message.author.username}: ${chatMessage}`,
				temperature: 0.3,
				maxTokens: 2000,
				maxSteps: 5,
				tools: {
					performDiscordTask: tool({
						description:
							'Execute Discord bot operations like moderation actions, information gathering, server management, etc. Use this when the user asks you to DO something rather than just answer questions.',
						parameters: z.object({
							task: z.string().describe('Clear description of what Discord operation to perform'),
							reasoning: z.string().describe('Brief explanation of why this task is needed')
						}),
						execute: async ({ task, reasoning }) => {
							console.log(`Executing Discord task: ${task} (${reasoning})`);

							try {
								const result = await this.generateCodeWithGroq(task, message);
								if (!result) {
									return 'Failed to generate code for the requested task. The request might be too complex or unclear.';
								}

								if (result.confidence < 0.7) {
									return `I'm not confident enough (${Math.round(result.confidence * 100)}%) about executing this task. Could you be more specific about what you want me to do?`;
								}

								// if (result.destructive) {
								// 	return `⚠️ This operation appears to be destructive (${result.description}). For safety, I won't execute it automatically. If you're sure, please run the eval command manually with this code:\n\`\`\`js\n${result.code}\n\`\`\``;
								// }

								const evalOutput = await this.evalCode(message, result.code, {
									async: true,
									depth: 1,
									showHidden: false,
									stack: true
								}).catch((e: Error) => {
									return {
										success: false,
										result: `Error executing task: ${e.message}`,
										time: ''
									};
								});

								console.log('Eval Output:', evalOutput);

								if (!evalOutput.success) {
									return `❌ Task failed: ${evalOutput.result}`;
								}

								if (evalOutput.result === 'undefined' || evalOutput.result === 'null') {
									return `✅ Task completed successfully: ${result.description}`;
								}

								return `✅ Task completed: ${evalOutput.result}`;
							} catch (error) {
								console.error('Error in performDiscordTask:', error);
								return `❌ An error occurred while executing the task: ${error instanceof Error ? error.message : 'Unknown error'}`;
							}
						}
					})
				}
			});

			return text.trim();
		} catch (error) {
			console.error('Error in chat generation:', error);
			throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
	private async generateCodeWithGroq(naturalLanguageRequest: string, message: RadonCommand.Message) {
		const context = this.buildContext(message);

		const systemPrompt = `You are an expert Discord.js v14 code generator for the Radon moderation bot. Convert natural language requests into clean, executable JavaScript code.

${context}

IMPORTANT RULES:
1. Generate ONLY executable JavaScript code - no explanations, comments, or markdown
2. Use modern Discord.js v14 syntax and async/await patterns
3. Handle errors gracefully with try-catch when appropriate
4. Return meaningful values instead of console.log or sending messages
5. Use the available variables in scope (msg, guild, channel, member, client, container)
6. Focus on Discord bot operations: moderation, information gathering, server management
7. Be conservative with destructive operations - mark them as destructive: true
8. Always return a result, never undefined or null in a new line

COMMON PATTERNS TO USE:
- Member operations: member.ban({reason}), member.kick(reason), member.timeout(duration, reason)
- Role operations: member.roles.add(role), member.roles.remove(role)
- Channel operations: guild.channels.create({name, type}), channel.delete()
- Database: container.prisma.modelName.operation()
- Fetching: guild.members.fetch(id), guild.roles.cache.find(r => r.name === 'name')
- Information: guild.memberCount, guild.channels.cache.size, member.joinedAt

RETURN FORMAT: Generate code that returns a meaningful result, not undefined.

Examples:
- "ban user 123" → member = await guild.members.fetch('123'); await member.ban({reason: 'Requested by admin'}); return \`Banned \${member.user.tag}\`;
- "server member count" → return guild.memberCount;
- "create role test" → const role = await guild.roles.create({name: 'test'}); return \`Created role \${role.name}\`;`;

		const { object: result } = await generateObject({
			model: groq('deepseek-r1-distill-llama-70b'),
			system: systemPrompt,
			providerOptions: {
				groq: { reasoningFormat: 'hidden' }
			},
			prompt: `Generate JavaScript code for: "${naturalLanguageRequest}"
			
Context: User ${message.author.tag} in ${message.guild?.name || 'DMs'} requests this operation.`,
			temperature: 0.1,
			maxTokens: 800,
			schema: z.object({
				code: z.string().describe('Clean executable JavaScript code without any markdown or comments'),
				description: z.string().describe('Brief description of what the code does'),
				confidence: z.number().min(0).max(1).describe('Confidence level in the generated code (0-1)'),
				destructive: z.boolean().describe('Whether the code performs destructive operations like banning, deleting, etc.')
			})
		});

		// Clean up any markdown formatting that might have slipped through
		result.code = result.code
			.replace(/```(?:javascript|js)?\n?([\s\S]*?)\n?```/g, '$1')
			.replace(/^\/\/.*$/gm, '') // Remove comment lines
			.trim();

		console.log('Generated code:', result);

		return result;
	}
	private buildContext(message: RadonCommand.Message): string {
		const guildName = message.guild?.name || 'Direct Messages';
		const channelName = message.guild ? `#${(message.channel as any).name}` : 'DM';
		const memberCount = message.guild?.memberCount || 'N/A';

		return `
DISCORD BOT ENVIRONMENT (Radon - Moderation Bot):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Context:
• Guild: ${guildName} (${memberCount} members)
• Channel: ${channelName} (ID: ${message.channelId})
• User: ${message.author.tag} (ID: ${message.author.id})
• Bot: ${this.container.client.user?.tag}

AVAILABLE VARIABLES IN SCOPE:
• msg: Discord Message object (current message)
• guild: Discord Guild object (current server)
• channel: Discord Channel object (current channel)  
• member: Discord GuildMember object (message author)
• client: Discord Client (the bot)
• container: Sapphire Container (includes prisma, settings, utils)
• Discord: Discord.js v14 library (imported dynamically)

DATABASE ACCESS:
• container.prisma: Prisma client for database operations
• guild.settings: Guild-specific settings (if available)

DISCORD.JS V14 COMMON OPERATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Member Management:
• await guild.members.fetch('userId') - Get member by ID
• await member.ban({reason: 'reason'}) - Ban member
• await member.kick('reason') - Kick member  
• await member.timeout(duration, 'reason') - Timeout member
• await member.roles.add(role) - Add role to member
• await member.roles.remove(role) - Remove role from member

Channel Management:
• guild.channels.cache.find(c => c.name === 'name') - Find channel
• await guild.channels.create({name: 'name', type: Discord.ChannelType.GuildText}) - Create channel
• await channel.delete() - Delete channel
• await channel.setName('newname') - Rename channel

Role Management:
• guild.roles.cache.find(r => r.name === 'name') - Find role
• await guild.roles.create({name: 'name', color: 'Blue'}) - Create role
• await role.delete() - Delete role
• await role.setPermissions([Discord.PermissionFlagsBits.SendMessages]) - Set permissions

Information Gathering:
• guild.memberCount - Total members
• guild.channels.cache.size - Total channels
• guild.roles.cache.size - Total roles
• member.joinedAt - When member joined
• member.roles.cache.map(r => r.name) - Member's roles
• guild.ownerId - Server owner ID

Database Operations:
• await container.prisma.guildSettings.findUnique({where: {guildId}})
• await container.prisma.user.create({data: {...}})
• await container.prisma.warn.findMany({where: {userId}})

RETURN PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always return meaningful data, not undefined:
✅ return \`Successfully banned \${member.user.tag}\`;
✅ return guild.memberCount;
✅ return member.roles.cache.map(r => r.name).join(', ');
✅ return \`Created channel #\${channel.name}\`;
❌ Don't return undefined or just execute without returning

ERROR HANDLING:
Add try-catch for operations that might fail:
try {
    const member = await guild.members.fetch(userId);
    await member.ban({reason});
    return \`Banned \${member.user.tag}\`;
} catch (error) {
    return \`Failed to ban user: \${error.message}\`;
}`;
	}
	private async evalCode(message: RadonCommand.Message, code: string, flags: flags) {
		const stopwatch = new Stopwatch();
		if (code.includes('await')) flags.async = true;

		// @ts-ignore Unused variables
		const Discord = await import('discord.js');

		// Split code and ensure we return the last expression
		const ar = code.split(';').filter((line) => line.trim());
		const last = ar.pop()?.trim();

		// Wrap in async function if needed
		if (flags.async) {
			const codeBody = ar.length > 0 ? ar.join(';\n') + ';\n' : '';
			code = `(async () => {\n${codeBody}return ${last || 'undefined'};\n})();`;
		} else if (last) {
			code = ar.length > 0 ? ar.join(';\n') + ';\n' + last : last;
		}

		const msg = message;
		// @ts-ignore Unused variables
		const { guild, channel, member } = msg;
		const { container } = this;
		// @ts-ignore Unused variables
		const { client } = container;

		let success: boolean;
		let result: unknown;
		let asyncTime = '';
		let syncTime = '';
		let thenable = false;

		try {
			// eslint-disable-next-line no-eval
			result = eval(code);
			syncTime = stopwatch.toString();
			success = true;
		} catch (error) {
			if (!syncTime.length) syncTime = stopwatch.toString();
			if (thenable && !asyncTime.length) asyncTime = stopwatch.toString();
			success = false;
			result = flags.stack ? error : (error as Error).message;
		}
		stopwatch.stop();

		if (isThenable(result)) {
			thenable = true;
			stopwatch.restart();
			try {
				result = await result;
				asyncTime = stopwatch.toString();
			} catch (error) {
				asyncTime = stopwatch.toString();
				success = false;
				result = flags.stack ? error : (error as Error).message;
			}
		}
		stopwatch.stop();

		if (typeof result !== 'string') {
			result = inspect(result, {
				depth: flags.depth,
				showHidden: flags.showHidden
			});
		}

		const time = this.formatTime(syncTime, asyncTime);
		return { result: clean(result as string), success, time };
	}

	private formatTime(syncTime: string, asyncTime?: string) {
		return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
	}
}

interface flags {
	async: boolean;
	depth: number;
	showHidden: boolean;
	stack: boolean;
}
