import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';

@ApplyOptions<RadonCommand.Options>({
	description: 'Toggle AI chat mode in a channel (Owner only)',
	permissionLevel: PermissionLevels.BotOwner,
	guarded: true,
	aliases: ['tchat', 'aichat'],
	flags: ['off', 'disable', 'clear'],
	options: ['motive', 'm', 'target', 't'],
	detailedDescription: {
		usage: [
			'togglechat - Enable AI chat in current channel',
			'togglechat --off - Disable AI chat in current channel',
			'togglechat --motive="Be helpful and answer questions" - Set a goal/motive',
			'togglechat --target=@user1 @user2 - Target specific users only',
			'togglechat --target=@user --motive="Help them learn coding" - Combine options'
		],
		examples: [
			'togglechat',
			'togglechat --off',
			'togglechat --motive="Engage in casual conversation"',
			'togglechat --target=@John --motive="Help with server setup"'
		]
	}
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		if (!message.guild) {
			return send(message, '❌ This command can only be used in a server.');
		}

		const channelId = message.channelId;
		const guildId = message.guildId!;

		// Check for disable flags
		const shouldDisable = args.getFlags('off', 'disable', 'clear');

		if (shouldDisable) {
			// Delete the config
			await this.container.prisma.aiChatConfig
				.delete({
					where: { id: channelId }
				})
				.catch(() => null);

			return send(message, '✅ AI chat mode has been **disabled** in this channel.');
		}

		// Get options
		const motive = args.getOption('motive', 'm');
		const targetOption = args.getOption('target', 't');

		// Parse target users
		const targetUserIds: string[] = [];
		if (targetOption) {
			// Extract user IDs from mentions or raw IDs
			const mentionMatches = targetOption.matchAll(/<@!?(\d+)>/g);
			for (const match of mentionMatches) {
				targetUserIds.push(match[1]);
			}

			// Also support space-separated IDs
			const rawIds = targetOption.split(/\s+/).filter((id) => /^\d{17,19}$/.test(id));
			targetUserIds.push(...rawIds);
		}

		// Parse mentions from message content as well
		if (message.mentions.users.size > 0) {
			message.mentions.users.forEach((user) => {
				if (!targetUserIds.includes(user.id)) {
					targetUserIds.push(user.id);
				}
			});
		}

		// Create or update the config
		await this.container.prisma.aiChatConfig.upsert({
			where: { id: channelId },
			create: {
				id: channelId,
				guildId,
				enabled: true,
				targetUserIds,
				motive: motive || null,
				createdBy: message.author.id,
				personalityMode: 'default'
			},
			update: {
				enabled: true,
				targetUserIds,
				motive: motive || null,
				updatedAt: new Date()
			}
		});

		// Build response
		let response = `✅ AI chat mode is now **enabled** in <#${channelId}>!\n\n`;

		if (targetUserIds.length > 0) {
			response += `🎯 **Targeting:** ${targetUserIds.map((id) => `<@${id}>`).join(', ')}\n`;
		} else {
			response += `🎯 **Targeting:** Everyone in the channel\n`;
		}

		if (motive) {
			response += `🎬 **Motive:** ${motive}\n`;
		}
		return send(message, response);
	}
}
