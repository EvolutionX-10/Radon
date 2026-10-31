import { v2 } from '../../lib/presentation/components.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { ApplyOptions } from '@sapphire/decorators';
import { MessageFlags, InteractionContextType } from 'discord.js';
import { componentMessage, identity } from '../../lib/presentation/components.js';
import { reportContainer } from '../../lib/presentation/reports.js';
import { ModerationReports } from '../../lib/moderation/reports.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Report a message privately to server moderators', cooldownDelay: 30_000 })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerContextMenuCommand((builder) => builder.setName('Report Message').setType(3).setContexts(InteractionContextType.Guild));
	}

	public override async contextMenuRun(interaction: RadonCommand.MessageContextMenuCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const settings = await this.container.prisma.moderationReportSettings.findUnique({ where: { id: interaction.guildId } });
		if (!settings)
			return interaction.editReply(
				v2('Message reporting is not configured in this server. Ask staff to use /reports configure.', 'Message report')
			);
		const message = interaction.targetMessage;
		const channel = await interaction.guild.channels.fetch(settings.channelId);
		if (!channel?.isTextBased() || !channel.isSendable() || channel.permissionsFor(interaction.guild.roles.everyone)?.has('ViewChannel')) {
			return interaction.editReply(
				v2('The staff report channel is unavailable or public. Ask an administrator to reconfigure it.', 'Message report')
			);
		}
		const { created, report } = await new ModerationReports(this.container.prisma).submit({
			guildId: interaction.guildId,
			channelId: message.channelId,
			messageId: message.id,
			targetId: message.author.id,
			reporterId: interaction.user.id,
			messageUrl: message.url,
			excerpt: message.content || '[No text available; open the original message]'
		});
		if (!created) return interaction.editReply(v2(`You already reported this message. Report ID: ${report.id}.`, 'Message report'));
		try {
			const [author, reporter] = await Promise.all([
				identity(interaction.guild, message.author.id, message.author),
				identity(interaction.guild, interaction.user.id, interaction.user)
			]);
			const sent = await channel.send(v2(componentMessage(reportContainer(report, author, reporter, true)), 'Message report'));
			await this.container.prisma.moderationReport.update({ where: { id: report.id }, data: { reviewMessageId: sent.id } });
			return interaction.editReply(v2(`Report sent privately to moderators. Report ID: ${report.id}.`, 'Message report'));
		} catch (error) {
			this.container.logger.error('Report saved but delivery failed', error);
			return interaction.editReply(
				v2(
					`Your report was saved, but the staff notification failed. Staff can find it in /reports list. Report ID: ${report.id}.`,
					'Message report'
				)
			);
		}
	}
}
