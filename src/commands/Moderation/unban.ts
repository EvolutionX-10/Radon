import { RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildMember } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	description: `Remove a ban from a user`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BAN_MEMBERS'],
	runIn: 'GUILD_ANY'
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const user = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason') || undefined;
		const ban = await interaction.guild.bans.fetch(user.id).catch(() => null);
		if (!ban)
			return interaction.reply({
				content: `${vars.emojis.cross} ${user} [${user.username}] is not banned!`,
				ephemeral: true
			});

		let content = `${vars.emojis.confirm} ${user} [${user.username}] has been unbanned ${reason ? `for the following reason: ${reason}` : ''}`;
		await interaction.guild.bans.remove(user, reason);
		//* Sending DM to the user
		await user
			.send({
				content: `You have been unbanned from ${interaction.guild.name}\n${reason ? `Reason: ${reason}` : ''}`
			})
			.catch(() => (content += `\n${vars.emojis.cross} Couldn't DM user!`));

		const data: BaseModActionData = {
			action: 'unban',
			moderator: interaction.member as GuildMember,
			reason,
			target: await interaction.guild.members.fetch(user.id)
		};

		if (await interaction.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		return interaction.reply({
			content,
			ephemeral: true
		});
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addUserOption((option) =>
						option //
							.setName('user')
							.setDescription('The id of the user to unban')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the ban uplift')
							.setRequired(true)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['947830619386302525', '951679387084922930']
			}
		);
	}
}
