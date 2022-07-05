import { RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildMember } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	description: `Kick a member`,
	permissionLevel: PermissionLevels.Moderator,
	runIn: 'GUILD_ANY',
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	requiredClientPermissions: ['KICK_MEMBERS']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const member = interaction.options.getMember('member') as GuildMember;
		const reason = interaction.options.getString('reason') as string;
		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'kick');
		if (!result) return interaction.reply({ content: ctn, ephemeral: true });
		let content = `${vars.emojis.confirm} ${member.user.tag} has been kicked ${reason ? `for the following reason: ${reason}` : ''}`;
		await member
			.send({
				content: `You have been kicked from ${member.guild.name} ${reason ? `for the following reason: ${reason}` : ''}`
			})
			.catch(() => (content += `\n${vars.emojis.cross} Couldn't DM ${member}`));
		const kicked = await member.kick(reason).catch(() => null);
		if (!kicked)
			return interaction.reply({
				content: `Kick failed`,
				ephemeral: true
			});
		await interaction.reply({
			content,
			ephemeral: true
		});

		const data: BaseModActionData = {
			moderator: interaction.member as GuildMember,
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
							.setName('member')
							.setDescription('The member to kick')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the kick')
							.setRequired(false)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['947723984949092392', '951679380692828180']
			}
		);
	}
}
