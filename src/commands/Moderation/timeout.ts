import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels, RadonEvents, TimeoutActionData } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember } from 'discord.js';
import { Duration, DurationFormatter } from '@sapphire/time-utilities';

@ApplyOptions<RadonCommand.Options>({
	description: `Temporarily mute a member`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MODERATE_MEMBERS'],
	runIn: 'GUILD_ANY'
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member)
			return interaction.editReply({
				content: 'No member found!'
			});
		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'timeout');
		if (!result || member.user.bot)
			return interaction.editReply({
				content: ctn || `${vars.emojis.cross} I can't perform timeout on bots!`
			});
		let time = interaction.options.getString('duration', true);
		if (!isNaN(Number(time))) time += 's';
		const duration = new Duration(time).offset;
		if (isNaN(duration))
			return interaction.editReply({
				content: 'Invalid duration! Valid examples: `1d`, `1h`, `1m`, `1s`\nTo remove a timeout just put `0` as the duration.'
			});
		if (duration > 2419200000) {
			return interaction.editReply({
				content: 'You cannot timeout a user for more than 28 days!'
			});
		}
		let content = `${vars.emojis.confirm} ${member} [${member.user.tag}] has been timed out for ${new DurationFormatter().format(duration)}`;
		const reason = interaction.options.getString('reason') || undefined;
		await member.timeout(duration, reason);
		if (duration !== 0) {
			await member
				.send({
					content: `You have been timed out for ${new DurationFormatter().format(duration)}!\nServer: ${interaction.guild.name}`
				})
				.catch(() => (content += `\n${vars.emojis.cross} Couldn't DM the member!`));
		}

		const data: TimeoutActionData = {
			moderator: interaction.member as GuildMember,
			target: member,
			reason,
			action: 'timeout',
			duration: new Timestamp(Date.now() + duration)
		};

		if ((await interaction.guild.settings?.modlogs.modLogs_exist()) && duration !== 0) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		if (duration === 0) content = `${vars.emojis.confirm} Removed timeout from ${member} [${member.user.tag}]`;
		return interaction.editReply({ content });
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'member',
						description: `The member to timeout`,
						type: Constants.ApplicationCommandOptionTypes.USER,
						required: true
					},
					{
						name: 'duration',
						description: `The duration of the timeout`,
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: true
					},
					{
						name: 'reason',
						description: `The reason for the timeout`,
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['948096165017169943', '951679384476086353']
			}
		);
	}
}
