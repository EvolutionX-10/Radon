import { v2 } from '../../lib/presentation/components.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevels } from '#lib/types';
import { ModerationCases } from '../../lib/moderation/cases.js';
import { card, componentMessage, date, divider, identity, person, safe, text } from '../../lib/presentation/components.js';
import { guideContainer } from '../../lib/redemption/guide.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Review moderation cases and add staff notes', permissionLevel: PermissionLevels.Moderator })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.addSubcommand((s) => s.setName('help').setDescription('Understand cases, references, notes, and reason edits'))
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
		if (subcommand === 'help') return interaction.editReply(v2(componentMessage(guideContainer('cases')), 'Moderation case'));
		if (subcommand === 'history') {
			const records = await cases.history(
				guildId,
				interaction.options.getUser('member', true).id,
				interaction.options.getString('before') ?? undefined
			);
			const member = await identity(
				interaction.guild,
				interaction.options.getUser('member', true).id,
				interaction.options.getUser('member', true)
			);
			const panel = card('Moderation history', `${records.length} recent case${records.length === 1 ? '' : 's'}`);
			person(panel, 'Member', member);
			if (!records.length) text(panel, 'No cases found.');
			for (const record of records) {
				divider(panel);
				text(
					panel,
					`**${record.action}** · ${date(record.createdAt)}\n${safe(record.reason || 'No reason provided', 90)}\n-# Case reference: \`${record.id}\``
				);
			}
			if (records.length) text(panel, `-# Older cases: /case history member:MEMBER before:${records.at(-1)!.id}`);
			return interaction.editReply(v2(componentMessage(panel), 'Moderation case'));
		}
		const id = interaction.options.getString('id', true);
		const record = await cases.get(guildId, id);
		if (!record) return interaction.editReply(v2('Case not found in this server.', 'Moderation case'));
		if (subcommand === 'note') {
			await cases.addNote(guildId, id, interaction.user.id, interaction.options.getString('text', true));
			return interaction.editReply(v2('Staff note added.', 'Moderation case'));
		}
		if (subcommand === 'reason') {
			await cases.editReason(guildId, id, interaction.user.id, interaction.options.getString('text', true));
			return interaction.editReply(v2('Case reason updated. Previous reasons remain in the audit trail.', 'Moderation case'));
		}
		const [target, moderator] = await Promise.all([identity(interaction.guild, record.targetId), identity(interaction.guild, record.actorId)]);
		const panel = card(`${record.action.charAt(0).toUpperCase() + record.action.slice(1)} · Case details`, date(record.createdAt));
		person(panel, 'Member', target);
		text(panel, `**Moderator** · **${safe(moderator.name, 100)}** · <@${moderator.id}>`);
		divider(panel);
		text(panel, `### Reason\n${safe(record.reason || 'No reason provided', 512)}`);
		text(
			panel,
			`### Recent staff notes\n${
				record.notes
					.slice(-5)
					.map((note) => `${date(note.createdAt)} · <@${note.actorId}>\n${safe(note.text, 140)}`)
					.join('\n') || 'No staff notes yet.'
			}`
		);
		text(
			panel,
			`### Recent reason edits\n${
				record.reasonEdits
					.slice(-5)
					.map(
						(edit) => `${date(edit.createdAt)} · <@${edit.actorId}>\n${safe(edit.previous || 'No reason', 65)} → ${safe(edit.reason, 65)}`
					)
					.join('\n') || 'No reason edits yet.'
			}`
		);
		divider(panel);
		text(
			panel,
			`-# Case reference: \`${record.id}\`\n-# /case note adds a staff note. /case reason edits this saved record. Use Edit Reason on the log to update both. See /case help.`
		);
		return interaction.editReply(v2(componentMessage(panel), 'Moderation case'));
	}
}
