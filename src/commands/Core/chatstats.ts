import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'View AI chat mode statistics and active channels',
	permissionLevel: PermissionLevels.BotOwner,
	guarded: true,
	aliases: ['chatstats', 'aistats']
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message) {
		if (!message.guild) {
			return send(message, '❌ This command can only be used in a server.');
		}

		// Fetch all AI chat configs for this guild
		const configs = await this.container.prisma.aiChatConfig.findMany({
			where: { guildId: message.guildId! }
		});

		if (configs.length === 0) {
			return send(message, '📊 No AI chat modes are currently active in this server.\n\nUse `!togglechat` to enable AI chat in a channel!');
		}

		const embed = new EmbedBuilder()
			.setTitle('🤖 AI Chat Mode Statistics')
			.setColor(0x00ff00)
			.setTimestamp()
			.setFooter({ text: `${configs.length} active channel${configs.length === 1 ? '' : 's'}` });

		let description = '';

		for (const config of configs) {
			const channel = message.guild.channels.cache.get(config.id);
			const channelName = channel ? `<#${config.id}>` : `Unknown Channel (${config.id})`;

			description += `\n**${channelName}**\n`;
			description += `┣ Status: ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n`;

			if (config.targetUserIds.length > 0) {
				const targets = config.targetUserIds.map((id) => `<@${id}>`).join(', ');
				description += `┣ Targets: ${targets}\n`;
			} else {
				description += `┣ Targets: Everyone\n`;
			}

			if (config.motive) {
				description += `┣ Motive: ${config.motive.length > 50 ? config.motive.slice(0, 50) + '...' : config.motive}\n`;
			}

			description += `┣ Created: <t:${Math.floor(config.createdAt.getTime() / 1000)}:R>\n`;
			description += `┗ Created by: <@${config.createdBy}>\n`;
		}

		embed.setDescription(description);

		return send(message, { embeds: [embed] });
	}
}
