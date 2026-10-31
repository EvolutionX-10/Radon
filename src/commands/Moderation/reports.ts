import { v2 } from '../../lib/presentation/components.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevel } from '#lib/decorators';
import { PermissionLevels } from '#lib/types';
import { card, componentMessage, divider, identity, text } from '../../lib/presentation/components.js';
import { reportContainer } from '../../lib/presentation/reports.js';
import { ModerationReports } from '../../lib/moderation/reports.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Configure and review private member reports', permissionLevel: PermissionLevels.Moderator })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((b) =>
			b
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.addSubcommand((s) =>
					s
						.setName('configure')
						.setDescription('Set a private staff report channel')
						.addChannelOption((o) =>
							o
								.setName('channel')
								.setDescription('Staff channel hidden from @everyone')
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true)
						)
				)
				.addSubcommand((s) => s.setName('list').setDescription('List the oldest pending reports'))
				.addSubcommand((s) =>
					s
						.setName('view')
						.setDescription('View a stored report')
						.addStringOption((o) => o.setName('id').setDescription('Report ID').setRequired(true))
				)
				.addSubcommand((s) =>
					s
						.setName('reset')
						.setDescription('Return an interrupted report review to pending')
						.addStringOption((o) => o.setName('id').setDescription('Report ID').setRequired(true))
				)
		);
	}
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'configure') return this.configure(interaction);
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		if (subcommand === 'list') {
			const records = await this.container.prisma.moderationReport.findMany({
				where: { guildId: interaction.guildId, status: { in: ['pending', 'reviewing'] } },
				orderBy: { createdAt: 'asc' },
				take: 10
			});
			const panel = card('Report inbox', `${records.length} open report${records.length === 1 ? '' : 's'} · Oldest first`);
			if (!records.length) text(panel, 'You’re all caught up. No open reports.');
			for (const report of records) {
				divider(panel);
				text(
					panel,
					`**${report.status}** · <@${report.targetId}> · reported by <@${report.reporterId}>\n[Open message](${report.messageUrl})\n-# Report reference: \`${report.id}\``
				);
			}
			text(panel, '-# Use /reports view with a report reference for the message and people involved.');
			return interaction.editReply(v2(componentMessage(panel), 'Reports'));
		}
		const id = interaction.options.getString('id', true);
		if (subcommand === 'reset') return this.reset(interaction, id);
		const record = await this.container.prisma.moderationReport.findFirst({ where: { id, guildId: interaction.guildId } });
		if (!record) return interaction.editReply(v2('Report not found in this server.', 'Reports'));
		const [author, reporter] = await Promise.all([identity(interaction.guild, record.targetId), identity(interaction.guild, record.reporterId)]);
		return interaction.editReply(v2(componentMessage(reportContainer(record, author, reporter)), 'Reports'));
	}

	@PermissionLevel('Administrator', 'configure')
	private async configure(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const channel = interaction.options.getChannel('channel', true);
		if (channel.type !== ChannelType.GuildText || channel.permissionsFor(interaction.guild.roles.everyone).has('ViewChannel'))
			return interaction.editReply(v2('Choose a staff text channel hidden from @everyone.', 'Reports'));
		if (!channel.permissionsFor(interaction.guild.members.me!).has(['ViewChannel', 'SendMessages', 'EmbedLinks']))
			return interaction.editReply(v2('I need View Channel, Send Messages, and Embed Links in that channel.', 'Reports'));
		await this.container.prisma.moderationReportSettings.upsert({
			where: { id: interaction.guildId },
			create: { id: interaction.guildId, channelId: channel.id },
			update: { channelId: channel.id }
		});
		return interaction.editReply(
			v2(
				`Report notifications will be sent to <#${channel.id}>. Review all role and member overwrites to ensure only trusted staff can read it.`,
				'Reports'
			)
		);
	}

	@PermissionLevel('Administrator', 'reset')
	private async reset(interaction: RadonCommand.ChatInputCommandInteraction, id: string) {
		const result = await new ModerationReports(this.container.prisma).reset(interaction.guildId, id);
		return interaction.editReply(
			v2(
				result
					? 'Report returned to pending. Check whether the previous action completed before taking another action.'
					: 'No interrupted review found.',
				'Reports'
			)
		);
	}
}
