import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevels } from '#lib/types';
import { ModerationCases } from '../../lib/moderation/cases.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags, escapeMarkdown, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Review moderation cases and add staff notes', permissionLevel: PermissionLevels.Moderator })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.addSubcommand((s) =>
					s
						.setName('view')
						.setDescription('View a case and its audit trail')
						.addStringOption((o) => o.setName('id').setDescription('Case ID').setRequired(true))
				)
				.addSubcommand((s) =>
					s
						.setName('history')
						.setDescription('View recent cases for a member')
						.addUserOption((o) => o.setName('member').setDescription('Member or user ID').setRequired(true))
						.addStringOption((o) => o.setName('before').setDescription('Case ID from the previous page (for older cases)'))
				)
				.addSubcommand((s) =>
					s
						.setName('note')
						.setDescription('Add a private staff note to a case')
						.addStringOption((o) => o.setName('id').setDescription('Case ID').setRequired(true))
						.addStringOption((o) => o.setName('text').setDescription('Staff note').setMaxLength(1000).setRequired(true))
				)
				.addSubcommand((s) =>
					s
						.setName('reason')
						.setDescription('Edit a case reason, retaining its audit trail')
						.addStringOption((o) => o.setName('id').setDescription('Case ID').setRequired(true))
						.addStringOption((o) => o.setName('text').setDescription('New reason').setMaxLength(512).setRequired(true))
				)
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const cases = new ModerationCases(this.container.prisma);
		const guildId = interaction.guildId;
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'history') {
			const records = await cases.history(
				guildId,
				interaction.options.getUser('member', true).id,
				interaction.options.getString('before') ?? undefined
			);
			const rows = records.map(
				(r) => `\`${r.id}\` — ${r.action} — ${r.createdAt.toISOString()}\n${escapeMarkdown(r.reason || 'No reason').slice(0, 100)}`
			);
			return interaction.editReply({
				content: rows.length ? rows.join('\n\n') + `\n\nNext page: before ${records.at(-1)!.id}` : 'No cases found.',
				allowedMentions: { parse: [] }
			});
		}
		const id = interaction.options.getString('id', true);
		const record = await cases.get(guildId, id);
		if (!record) return interaction.editReply('Case not found in this server.');
		if (subcommand === 'note') {
			await cases.addNote(guildId, id, interaction.user.id, interaction.options.getString('text', true));
			return interaction.editReply('Staff note added.');
		}
		if (subcommand === 'reason') {
			await cases.editReason(guildId, id, interaction.user.id, interaction.options.getString('text', true));
			return interaction.editReply('Case reason updated. Previous reasons remain in the audit trail.');
		}
		const notes = record.notes
			.slice(-5)
			.map((n) => `${n.createdAt.toISOString()} · ${n.actorId}: ${escapeMarkdown(n.text).slice(0, 180)}`)
			.join('\n');
		const edits = record.reasonEdits
			.slice(-5)
			.map(
				(e) =>
					`${e.createdAt.toISOString()} · ${e.actorId}: ${escapeMarkdown(e.previous).slice(0, 100)} → ${escapeMarkdown(e.reason).slice(0, 100)}`
			)
			.join('\n');
		return interaction.editReply({
			content:
				`**Case ${record.id}**\nAction: ${record.action}\nTarget: ${record.targetId}\nModerator: ${record.actorId}\nCreated: ${record.createdAt.toISOString()}\nReason: ${escapeMarkdown(record.reason || 'No reason').slice(0, 512)}\n\n**Recent staff notes**\n${notes || 'None'}\n\n**Recent reason edits**\n${edits || 'None'}`.slice(
					0,
					2000
				),
			allowedMentions: { parse: [] }
		});
	}
}
