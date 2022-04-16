import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { generateModLogDescription, runAllChecks, sec, severity } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	description: `Ban a member`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BAN_MEMBERS'],
	runIn: 'GUILD_ANY'
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member)
			return interaction.reply({
				content: `${vars.emojis.cross} You must specify a valid member`,
				ephemeral: true
			});
		const reason = interaction.options.getString('reason');
		const days = interaction.options.getInteger('days');
		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'ban');
		if (!result) return interaction.reply({ content: ctn, ephemeral: true });
		let content =
			`${vars.emojis.confirm} ${member} [${member.user.username}] has ` + `been banned ${reason ? `for the following reason: ${reason}` : ''}`;
		await member
			.send({
				content: `You have been banned from ${interaction.guild.name}` + `\n${reason ? `Reason: ${reason}` : ''}`
			})
			.catch(() => (content += `\n${vars.emojis.cross} Couldn't DM member!`));
		await member.ban({
			days: days ?? 0,
			reason: reason ?? undefined
		});
		const embed = this.container.utils
			.embed()
			._color(severity.ban)
			._author({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			});
		const description = generateModLogDescription({
			member,
			action: 'Ban',
			reason: reason ?? undefined
		});
		embed._description(description);
		if (interaction.guild && (await interaction.guild.settings?.modlogs.modLogs_exist())) {
			await interaction.guild.settings?.modlogs.sendModLog(embed);
		}
		return interaction.reply({
			content,
			ephemeral: true
		});
	}
	public override async registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'member',
						description: 'The member to ban',
						type: Constants.ApplicationCommandOptionTypes.USER,
						required: true
					},
					{
						name: 'reason',
						description: 'The reason for the ban',
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
				idHints: ['947756361876389898', '951679301030387742']
			}
		);
	}
}
