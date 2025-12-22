import { Color } from '#constants';
import { Embed, JustButtons } from '#lib/structures';
import type { RadonButtonInteraction } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class RoleMembersButtonHandler extends InteractionHandler {
	public override async parse(interaction: RadonButtonInteraction) {
		if (!interaction.customId.startsWith('role-members-')) return this.none();

		const roleId = interaction.customId.replace('role-members-', '');
		const role = await interaction.guild?.roles.fetch(roleId).catch(() => null);

		if (!role) {
			return this.none();
		}

		return this.some({ role, roleId });
	}

	public override async run(interaction: RadonButtonInteraction, result: InteractionHandler.ParseResult<this>) {
		const { role } = result;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		if (role.guild.members.cache.size < role.guild.memberCount) {
			console.log('Fetching all members for role members display...');
			console.log('Current Cache Size: ', role.guild.members.cache.size, ' | Total Members: ', role.guild.memberCount);
			await role.guild.members.fetch().catch(() => null);
			console.log('Finished fetching members. Cache Size: ', role.guild.members.cache.size);
		}
		const members = role.members
			.sort((a, b) => {
				return (b?.joinedTimestamp || 0) - (a?.joinedTimestamp || 0);
			})
			.map((member) => member);

		if (members.length === 0) {
			return interaction.editReply({
				content: `No members currently have the ${role} role.`
			});
		}

		const membersPerPage = 10;
		const pages = [];
		for (let i = 0; i < members.length; i += membersPerPage) {
			const pageMembers = members.slice(i, i + membersPerPage);
			const pageNumber = Math.floor(i / membersPerPage) + 1;
			const totalPages = Math.ceil(members.length / membersPerPage);
			const longestName = Math.max(...pageMembers.map((member) => member.displayName.length), 0);
			const paddedMembers = pageMembers.map((member) => {
				const padding = longestName - member.displayName.length;
				return `${member.displayName.trim()}${' '.repeat(padding)} │ ${member.id}`;
			});

			const memberList = paddedMembers
				.map((member, index) => {
					const position = i + index + 1;
					const maxPositionWidth = Math.max(2, (i + pageMembers.length).toString().length);
					const paddedPosition = position.toString().padStart(maxPositionWidth, '0');
					return ` ${paddedPosition} │ ${member}`;
				})
				.join('\n');
			const memberTitle = ` Member${' '.repeat(Math.max(longestName - 'Member'.length, 0))} `;

			const maxIndexWidth = Math.max(2, (i + pageMembers.length).toString().length);
			const formattedMemberList = `\`\`\`\n${''.padStart(maxIndexWidth)}# │${memberTitle}│ ID\n${'─'.repeat(maxIndexWidth)}──┼${'─'.repeat(memberTitle.length)}┼───────────────────\n${memberList}\`\`\``;
			const embed = new Embed()
				._title(`Members with ${role.name} role`)
				._description(formattedMemberList)
				._color(role.color || Color.General)
				._footer({
					text: `Page ${pageNumber} of ${totalPages} • ${members.length} member${members.length === 1 ? '' : 's'} total`,
					iconURL: interaction.guild?.iconURL({ forceStatic: false }) || undefined
				})
				._timestamp()
				._thumbnail(role.iconURL({ size: 256 }) || interaction.guild?.iconURL({ forceStatic: false, size: 256 }) || null);

			pages.push({ embeds: [embed] });
		}

		if (pages.length === 1) {
			return interaction.editReply(pages[0]);
		}

		const paginatedMessage = new JustButtons();

		for (const page of pages) {
			paginatedMessage.addPage(page);
		}

		return paginatedMessage.run(interaction);
	}
}
