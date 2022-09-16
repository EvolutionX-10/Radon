import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<RadonCommand.Options>({
	description: `Kick a member`,
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['KICK_MEMBERS']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		const reason = interaction.options.getString('reason') ?? undefined;

		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				ephemeral: true
			});
		}

		const { content: ctn, result } = runAllChecks(interaction.member, member, 'kick');
		if (!result) return interaction.reply({ content: ctn, ephemeral: true });

		let content = `${Emojis.Confirm} ${member.user.tag} has been kicked ${reason ? `for the following reason: ${reason}` : ''}`;

		await member
			.send({
				content: `You have been kicked from ${member.guild.name} ${reason ? `for the following reason: ${reason}` : ''}`
			})
			.catch(() => (content += `\n\n> ${Emojis.Cross} Couldn't DM member!`));

		const kicked = await member.kick(reason).catch(() => null);
		if (!kicked)
			return interaction.reply({
				content: `Kick failed due to missing permissions, please contact support server if this persists!`,
				ephemeral: true
			});

		await interaction.reply(content);

		const data: BaseModActionData = {
			moderator: interaction.member,
			target: member,
			action: 'kick',
			reason
		};

		if ((await interaction.guild.settings?.modlogs.modLogs_exist()) && kicked) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addUserOption((option) =>
						option //
							.setName('target')
							.setDescription('The target to kick')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the kick')
							.setRequired(false)
					),
			{ idHints: ['947723984949092392', '1019931917417730058'] }
		);
	}
}
