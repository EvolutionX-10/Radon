import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { generateModLogDescription, runAllChecks, sec, severity } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember, MessageEmbed } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	description: `Quickly bans and unbans, acts as a quick purge`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BAN_MEMBERS'],
	runIn: 'GUILD_ANY'
})
export class UserCommand extends RadonCommand {
	public async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
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
		const id = member.id;
		await member.ban({
			days: days ?? 1,
			reason: reason ?? undefined
		});
		await interaction.guild.members.unban(id, reason ?? undefined);
		const embed = new MessageEmbed().setColor(severity.softban).setAuthor({
			name: interaction.user.tag,
			iconURL: interaction.user.displayAvatarURL({ dynamic: true })
		});
		const description = generateModLogDescription({
			member,
			action: 'Soft Ban',
			reason: reason ?? undefined
		});
		embed.setDescription(description);
		if (interaction.guild && (await interaction.guild.settings?.modlogs.modLogs_exist())) {
			await interaction.guild.settings?.modlogs.sendModLog(embed);
		}
		return interaction.editReply(content);
	}
	public async registerApplicationCommands(registry: RadonCommand.Registry) {
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
