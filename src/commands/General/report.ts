import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, InteractionContextType } from 'discord.js';
import { ModerationReports } from '../../lib/moderation/reports.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Report a message privately to server moderators', cooldownDelay: 30_000 })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerContextMenuCommand((builder) => builder.setName('Report Message').setType(3).setContexts(InteractionContextType.Guild));
	}

	public override async contextMenuRun(interaction: RadonCommand.MessageContextMenuCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const settings = await this.container.prisma.moderationReportSettings.findUnique({ where: { id: interaction.guildId } });
		if (!settings) return interaction.editReply('Message reporting is not configured in this server. Ask staff to use /reports configure.');
		const message = interaction.targetMessage;
		const channel = await interaction.guild.channels.fetch(settings.channelId);
		if (!channel?.isTextBased() || !channel.isSendable() || channel.permissionsFor(interaction.guild.roles.everyone)?.has('ViewChannel')) {
			return interaction.editReply('The staff report channel is unavailable or public. Ask an administrator to reconfigure it.');
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
		if (!created) return interaction.editReply(`You already reported this message. Report ID: ${report.id}.`);
		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`report:dismiss:${report.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId(`report:timeout:${report.id}`).setLabel('Timeout 10 minutes').setStyle(ButtonStyle.Danger)
		);
		try {
			const sent = await channel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle('Message report')
						.setDescription(report.excerpt)
						.addFields(
							{ name: 'Reporter', value: interaction.user.id, inline: true },
							{ name: 'Author', value: message.author.id, inline: true },
							{ name: 'Original message', value: message.url },
							{ name: 'Report ID', value: report.id }
						)
						.setTimestamp()
				],
				components: [buttons],
				allowedMentions: { parse: [] }
			});
			await this.container.prisma.moderationReport.update({ where: { id: report.id }, data: { reviewMessageId: sent.id } });
			return interaction.editReply(`Report sent privately to moderators. Report ID: ${report.id}.`);
		} catch (error) {
			this.container.logger.error('Report saved but delivery failed', error);
			return interaction.editReply(
				`Your report was saved, but the staff notification failed. Staff can find it in /reports list. Report ID: ${report.id}.`
			);
		}
	}
}
