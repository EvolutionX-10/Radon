import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { Owners, RadonGuildId, TestServerGuildIds } from '#constants';
import { PermissionLevels } from '../../lib/types/permissionLevels.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { BUG_STATUSES, BugReportError, BugReports, requireBugOwner, type BugStatus } from '../../lib/bugs/service.js';
import { bugInbox, bugReportCard } from '../../lib/bugs/presentation.js';
import { v2 } from '../../lib/presentation/components.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Review private bot bug reports and manage misuse bans',
	permissionLevel: PermissionLevels.BotOwner
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		const choices = BUG_STATUSES.map((status) => ({ name: status, value: status }));
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.setContexts(InteractionContextType.Guild)
					.addSubcommand((sub) =>
						sub
							.setName('list')
							.setDescription('Read the private bug inbox')
							.addStringOption((option) =>
								option
									.setName('status')
									.setDescription('Report status (default: open)')
									.addChoices(...choices)
							)
							.addStringOption((option) =>
								option.setName('before').setDescription('Last report reference from the previous page').setMaxLength(100)
							)
					)
					.addSubcommand((sub) =>
						sub
							.setName('view')
							.setDescription('Read one saved bug report')
							.addStringOption((option) => option.setName('id').setDescription('Report reference').setMaxLength(100).setRequired(true))
					)
					.addSubcommand((sub) =>
						sub
							.setName('review')
							.setDescription('Resolve, dismiss, or reopen a report')
							.addStringOption((option) => option.setName('id').setDescription('Report reference').setMaxLength(100).setRequired(true))
							.addStringOption((option) =>
								option
									.setName('status')
									.setDescription('New status')
									.addChoices(...choices)
									.setRequired(true)
							)
							.addStringOption((option) =>
								option.setName('note').setDescription('Private review note').setMinLength(1).setMaxLength(500).setRequired(true)
							)
					)
					.addSubcommand((sub) =>
						sub
							.setName('ban')
							.setDescription('Ban a user from Radon for reporting misuse')
							.addUserOption((option) => option.setName('user').setDescription('User to ban from the bot').setRequired(true))
							.addStringOption((option) =>
								option
									.setName('reason')
									.setDescription('Private reason for the bot ban')
									.setMinLength(1)
									.setMaxLength(500)
									.setRequired(true)
							)
					)
					.addSubcommand((sub) =>
						sub
							.setName('unban')
							.setDescription('Restore a user’s access to Radon')
							.addUserOption((option) => option.setName('user').setDescription('User to unban').setRequired(true))
							.addStringOption((option) =>
								option
									.setName('reason')
									.setDescription('Private reason for restoring access')
									.setMinLength(1)
									.setMaxLength(500)
									.setRequired(true)
							)
					),
			{ guildIds: [...RadonGuildId, ...TestServerGuildIds] }
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		// Do not rely on Discord command visibility or framework guards for inbox privacy.
		if (!Owners.includes(interaction.user.id))
			return interaction.reply(v2({ content: 'Only the bot owner can review bug reports.', flags: MessageFlags.Ephemeral }, 'Bug reports'));
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const service = new BugReports(this.container.prisma, Owners);
		try {
			requireBugOwner(interaction.user.id, Owners);
			const subcommand = interaction.options.getSubcommand();
			if (subcommand === 'list') {
				const status = (interaction.options.getString('status') ?? 'open') as BugStatus;
				const page = await service.list(interaction.user.id, status, interaction.options.getString('before') ?? undefined);
				return interaction.editReply(bugInbox(page.reports, status, page.next));
			}
			if (subcommand === 'ban' || subcommand === 'unban') {
				const user = interaction.options.getUser('user', true);
				await service.setBan(interaction.user.id, user.id, subcommand === 'ban', interaction.options.getString('reason', true));
				return interaction.editReply(
					v2(
						subcommand === 'ban'
							? `User \`${user.id}\` is banned from Radon. Saved reports are retained.`
							: `User \`${user.id}\` can use Radon again.`,
						'Bug reports'
					)
				);
			}
			const id = interaction.options.getString('id', true);
			if (subcommand === 'review') {
				const result = await service.review(
					interaction.user.id,
					id,
					interaction.options.getString('status', true) as BugStatus,
					interaction.options.getString('note', true)
				);
				return interaction.editReply(v2(result.count ? 'Report review saved.' : 'Report not found.', 'Bug reports'));
			}
			const report = await service.view(interaction.user.id, id);
			return interaction.editReply(report ? bugReportCard(report) : v2('Report not found.', 'Bug reports'));
		} catch (error) {
			if (error instanceof BugReportError) return interaction.editReply(v2(error.message, 'Bug reports'));
			this.container.logger.error('Could not read or update the private bug inbox.');
			return interaction.editReply(v2('The bug inbox is unavailable. Please try again.', 'Bug reports'));
		}
	}
}
