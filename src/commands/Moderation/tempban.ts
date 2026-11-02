import { v2 } from '../../lib/presentation/components.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { ModerationAction } from '../../lib/structures/classes/ModerationAction.js';
import { PermissionLevels, RadonEvents } from '#lib/types';
import { Duration } from '@sapphire/duration';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { TemporaryBans } from '../../lib/moderation/temporaryBans.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Schedule a temporary ban that survives restarts',
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BanMembers']
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((b) =>
			b
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.addSubcommand((s) =>
					s
						.setName('add')
						.setDescription('Ban a current member and schedule their unban')
						.addUserOption((o) => o.setName('member').setDescription('Member to ban').setRequired(true))
						.addStringOption((o) => o.setName('duration').setDescription('Between 1 minute and 365 days, e.g. 7d').setRequired(true))
						.addStringOption((o) => o.setName('reason').setDescription('Moderation reason').setMaxLength(400).setRequired(true))
				)
				.addSubcommand((s) =>
					s
						.setName('cancel')
						.setDescription('Cancel a scheduled unban; the member remains banned')
						.addUserOption((o) => o.setName('member').setDescription('Banned user').setRequired(true))
				)
				.addSubcommand((s) => s.setName('list').setDescription('List pending automatic unbans'))
		);
	}
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const service = new TemporaryBans(this.container.prisma, interaction.client);
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'list') {
			const tasks = await this.container.prisma.moderationScheduledBan.findMany({
				where: { guildId: interaction.guildId, status: { in: ['preparing', 'scheduled'] } },
				orderBy: { dueAt: 'asc' },
				take: 10
			});
			return interaction.editReply(
				v2(
					{
						content:
							tasks
								.map(
									(t) =>
										`${t.targetId} · ${t.status} · due ${t.dueAt.toISOString()}${t.lastError ? `\nLast attempt: ${t.lastError.slice(0, 100)}` : ''}`
								)
								.join('\n\n') || 'No pending automatic unbans.',
						allowedMentions: { parse: [] }
					},
					'Temporary ban'
				)
			);
		}
		const user = interaction.options.getUser('member', true);
		if (subcommand === 'cancel') {
			const cancelled = await service.cancel(interaction.guildId, user.id);
			return interaction.editReply(
				v2(
					cancelled
						? 'Scheduled unban cancelled. The member remains banned until a moderator unbans them.'
						: 'No pending schedule found, or a worker is currently processing it.',
					'Temporary ban'
				)
			);
		}
		const duration = new Duration(interaction.options.getString('duration', true)).offset;
		if (!Number.isFinite(duration) || duration < 60_000 || duration > 365 * 24 * 60 * 60_000)
			return interaction.editReply(v2('Choose a duration between 1 minute and 365 days, for example 7d.', 'Temporary ban'));
		const target = await interaction.guild.members.fetch({ user: user.id, force: true }).catch(() => null);
		if (!target) return interaction.editReply(v2('Temporary bans currently require a member who is in this server.', 'Temporary ban'));
		if (
			target.id === interaction.user.id ||
			target.id === interaction.guild.ownerId ||
			(interaction.member.id !== interaction.guild.ownerId && interaction.member.roles.highest.comparePositionTo(target.roles.highest) <= 0)
		)
			return interaction.editReply(
				v2('You cannot ban yourself, the server owner, or a member at or above your highest role.', 'Temporary ban')
			);
		const reason = interaction.options.getString('reason', true);
		let task;
		try {
			task = await service.prepare(interaction.guildId, user.id, interaction.user.id, reason, new Date(Date.now() + duration));
		} catch (error) {
			if ((error as { code?: string }).code === 'P2002')
				return interaction.editReply(v2('This member already has a pending temporary ban.', 'Temporary ban'));
			throw error;
		}
		const data = { action: 'ban' as const, moderator: interaction.member, target, reason: task.expectedReason };
		try {
			await new ModerationAction(interaction.guild).invoke(data, { temporaryBanGeneration: task.generation });
			interaction.client.emit(RadonEvents.ModAction, data);
			return interaction.editReply(v2(`Member banned. Automatic unban scheduled for ${task.dueAt.toISOString()}.`, 'Temporary ban'));
		} catch (error) {
			this.container.logger.error('Temporary ban request failed or its outcome is unknown', error);
			return interaction.editReply(
				v2(
					'The ban or schedule could not be confirmed. The recovery record is retained; check /tempban list and the server ban list before retrying.',
					'Temporary ban'
				)
			);
		}
	}
}
