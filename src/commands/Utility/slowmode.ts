import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, TextChannel } from 'discord.js';
import hd from 'humanize-duration';
import ms from 'ms';
@ApplyOptions<RadonCommand.Options>({
	description: 'View and Manage slowmode of current channel',
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MANAGE_CHANNELS'],
	runIn: ['GUILD_ANY']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		let time = interaction.options.getString('duration');
		if (!time) {
			await interaction.deferReply({ ephemeral: true });
			return interaction.editReply({
				content: `Currently Slowmode is ${
					(interaction.channel as TextChannel).rateLimitPerUser
						? `${hd((interaction.channel as TextChannel).rateLimitPerUser * 1000)}`
						: 'disabled'
				}`
			});
		}
		if (!isNaN(Number(time))) time += 's';
		const duration = ms(time);
		if (isNaN(duration))
			return interaction.reply({
				content: 'Invalid duration! Valid examples: `1h`, `1m`, `1s`, `2 hours`\nTo remove slowmode just put `0` as the duration.',
				ephemeral: true
			});
		if (duration > 21600000) {
			return interaction.reply({
				content: 'You cannot set slowmode for more than 6hrs!'
			});
		}
		let content = `${vars.emojis.confirm} Set the slowmode for ${hd(duration, { round: true })} in ${interaction.channel}`;
		if (duration === 0) {
			content = `${vars.emojis.confirm} Removed slowmode from ${interaction.channel}`;
		}
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;
		await (interaction.channel as TextChannel).setRateLimitPerUser(Math.floor(duration / 1000), reason);
		await interaction.reply({
			content
		});
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'duration',
						description: 'The amount of time to set the slowmode to, enter 0 to turn off',
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false
					},
					{
						name: 'reason',
						description: 'The reason for the slowmode',
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['954799793559986296', '954796834038112276']
			}
		);
	}
}
