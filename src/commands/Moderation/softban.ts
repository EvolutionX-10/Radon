import { RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	description: `Quickly bans and unbans, acts as a quick purge`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BAN_MEMBERS'],
	runIn: 'GUILD_ANY'
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member)
			return interaction.editReply({
				content: `${vars.emojis.cross} You must specify a valid member`
			});
		const reason = interaction.options.getString('reason');
		const days = interaction.options.getInteger('days');
		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'soft ban');
		if (!result) return interaction.editReply(ctn);
		const content =
			`${vars.emojis.confirm} ${member} [${member.user.username}] has ` +
			`been soft banned ${reason ? `for the following reason: ${reason}` : ''}`;
		const { id } = member;
		await member.ban({
			days: days ?? 1,
			reason: reason ?? undefined
		});
		await interaction.guild.members.unban(id, reason ?? undefined);

		const data: BaseModActionData = {
			action: 'softban',
			moderator: interaction.member as GuildMember,
			target: member,
			reason: reason ?? undefined
		};

		if (await interaction.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		return interaction.editReply(content);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'member',
						description: 'The member to soft ban',
						type: Constants.ApplicationCommandOptionTypes.USER,
						required: true
					},
					{
						name: 'reason',
						description: 'The reason for the soft ban',
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false
					},
					{
						name: 'days',
						description: 'The days of messages to delete (not a temp ban)',
						type: Constants.ApplicationCommandOptionTypes.INTEGER,
						maxValue: 7,
						minValue: 1,
						required: false
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['948096163398160415', '951679382991282186']
			}
		);
	}
}
