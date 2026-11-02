import { v2 } from '../../lib/presentation/components.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags, ComponentType } from 'discord.js';
import { isModerationStaff } from '../../lib/moderation/authorization.js';
import { ModerationReports } from '../../lib/moderation/reports.js';
import { ModerationAction } from '../../lib/structures/classes/ModerationAction.js';
import { Timestamp } from '../../lib/structures/classes/Timestamp.js';
import { RadonEvents } from '#lib/types';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.Button })
export class UserHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		const match = /^report:(dismiss|timeout):([a-f0-9]{32})$/.exec(interaction.customId);
		return match ? this.some({ action: match[1], id: match[2] }) : this.none();
	}
	public override async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const moderator = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
		if (!(await isModerationStaff(moderator, this.container.prisma)))
			return interaction.editReply(v2('Only configured moderation staff can review reports.', 'Report review'));
		const report = await this.container.prisma.moderationReport.findFirst({ where: { id: result.id, guildId: interaction.guildId! } });
		if (!report || report.reviewMessageId !== interaction.message.id || interaction.message.author.id !== interaction.client.user.id)
			return interaction.editReply(v2('This report message is no longer valid.', 'Report review'));
		const reports = new ModerationReports(this.container.prisma);
		if (!(await reports.claim(interaction.guildId!, report.id, moderator.id, result.action)))
			return interaction.editReply(v2('This report is already reviewed or another moderator is reviewing it.', 'Report review'));
		let performed = false;
		let attempted = false;
		try {
			if (result.action === 'timeout') {
				const target = await interaction.guild.members.fetch({ user: report.targetId, force: true });
				if (
					target.user.bot ||
					target.id === moderator.id ||
					target.id === interaction.guild.ownerId ||
					(moderator.id !== interaction.guild.ownerId && moderator.roles.highest.comparePositionTo(target.roles.highest) <= 0)
				)
					throw new Error('Cannot moderate this target');
				const data = {
					moderator,
					target,
					action: 'timeout' as const,
					duration: new Timestamp(Date.now() + 10 * 60_000),
					reason: `Message report ${report.id}`,
					url: report.messageUrl
				};
				attempted = true;
				await new ModerationAction(interaction.guild).invoke(data);
				performed = true;
				interaction.client.emit(RadonEvents.ModAction, data);
			}
			if (!(await reports.finish(interaction.guildId!, report.id, moderator.id, result.action === 'timeout' ? 'actioned' : 'dismissed')))
				throw new Error('Report claim changed before completion');
			if (interaction.message.flags?.has(MessageFlags.IsComponentsV2)) {
				const disable = (component: any): any => {
					const data = component.toJSON?.() ?? component;
					return {
						...data,
						...(data.type === ComponentType.Button && data.custom_id?.startsWith('report:') ? { disabled: true } : {}),
						...(data.type === ComponentType.TextDisplay && data.content?.startsWith('## Message report')
							? {
									content: `## Message report\n**${result.action === 'timeout' ? 'actioned' : 'dismissed'}** · Reviewed by <@${moderator.id}>`
								}
							: {}),
						...(data.components ? { components: data.components.map(disable) } : {})
					};
				};
				await interaction.message
					.edit({ components: interaction.message.components.map(disable), allowedMentions: { parse: [] } })
					.catch(() => null);
			} else await interaction.message.edit({ components: [] }).catch(() => null);
			return interaction.editReply(
				v2(result.action === 'timeout' ? 'Member timed out for 10 minutes. Report resolved.' : 'Report dismissed.', 'Report review')
			);
		} catch (error) {
			// Once timeout execution starts, network errors may hide a successful action. Keep its claim locked.
			if (!attempted) await reports.reset(interaction.guildId!, report.id, moderator.id);
			this.container.logger.error('Report review failed', error);
			return interaction.editReply(
				v2(
					performed
						? 'The timeout completed, but saving the report outcome failed. Ask an administrator to review it before retrying.'
						: attempted
							? 'The timeout outcome could not be confirmed. The report remains in review. Inspect the member before an administrator resets it.'
							: 'The action failed. The report remains pending.',
					'Report review'
				)
			);
		}
	}
}
