import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { type BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Remove a ban from a user`,
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BanMembers']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const user = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason') ?? undefined;
		const ban = await interaction.guild.bans.fetch(user.id).catch(() => null);

		if (!ban)
			return interaction.reply({
				content: `${Emojis.Cross} ${user} is not banned!`,
				flags: MessageFlags.Ephemeral
			});

		const content = `${Emojis.Confirm} ${user} has been unbanned ${reason ? `for the following reason: ${reason}` : ''}`;
		await interaction.guild.bans.remove(user, reason);

		const reply = await interaction.reply({ content, withResponse: true });

		const data: BaseModActionData = {
			action: 'unban',
			moderator: interaction.member,
			reason,
			target: user,
			url: reply.resource?.message?.url
		};

		if (await interaction.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		return;
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
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
							.setRequired(false)
					),
			{ idHints: ['947830619386302525', '1019932001790349312'] }
		);
	}
}
