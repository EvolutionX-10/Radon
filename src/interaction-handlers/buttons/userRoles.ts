import { Color } from '#constants';
import { Embed, JustButtons } from '#lib/structures';
import type { RadonButtonInteraction } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class UserRolesButtonHandler extends InteractionHandler {
	public override async parse(interaction: RadonButtonInteraction) {
		if (!interaction.customId.startsWith('user-roles-')) return this.none();

		const userId = interaction.customId.replace('user-roles-', '');
		const member = await interaction.guild?.members.fetch(userId).catch(() => null);

		if (!member) {
			return this.none();
		}

		return this.some({ member, userId });
	}

	public override async run(interaction: RadonButtonInteraction, result: InteractionHandler.ParseResult<this>) {
		const { member } = result;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const totalRoles = member.guild.roles.cache.size;

		// Get all roles except @everyone
		const roles = member.roles.cache
			.filter((role) => role.id !== member.guild.id)
			.sort((a, b) => b.position - a.position)
			.map((role) => role);

		if (roles.length === 0) {
			return interaction.editReply({
				content: `${member.user.globalName || member.user.username} has no roles besides @everyone.`
			});
		}

		// Split roles into chunks of 10 for pagination
		const rolesPerPage = 10;
		const pages = [];
		for (let i = 0; i < roles.length; i += rolesPerPage) {
			const pageRoles = roles.slice(i, i + rolesPerPage);
			const pageNumber = Math.floor(i / rolesPerPage) + 1;
			const totalPages = Math.ceil(roles.length / rolesPerPage);
			const roleList = pageRoles
				.map((role, index) => {
					const position = i + index + 1;
					const serverRank = totalRoles - role.position;

					return `\`${position.toString().padStart(2, '0')}\` **│** \`${serverRank.toString().padStart(2, '0')}\` **│** ${role} **│** \`${role.id}\``;
				})
				.join('\n');

			const formattedRoleList = `\`\`\`\n #  │ Rank │ Role\n────┼──────┼─────────────────────\`\`\`\n${roleList}`;
			const embed = new Embed()
				._title(`${member.user.globalName || member.user.username}'s Roles`)
				._description(formattedRoleList)
				._color(member.displayColor || Color.General)
				._footer({
					text: `Page ${pageNumber} of ${totalPages} • ${roles.length} role${roles.length === 1 ? '' : 's'} total`,
					iconURL: member.user.displayAvatarURL({ forceStatic: false })
				})
				._timestamp()
				._thumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 256 }));

			pages.push({ embeds: [embed] });
		}

		if (pages.length === 1) {
			// If only one page, send it directly
			return interaction.editReply(pages[0]);
		}

		// Use JustButtons for pagination
		const paginatedMessage = new JustButtons();

		for (const page of pages) {
			paginatedMessage.addPage(page);
		}

		return paginatedMessage.run(interaction);
	}
}
