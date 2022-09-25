import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Duration, DurationFormatter } from '@sapphire/duration';
import { PermissionFlagsBits } from 'discord-api-types/v9';

@ApplyOptions<RadonCommand.Options>({
	description: 'View and Manage slowmode of current channel',
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MANAGE_CHANNELS']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		let time = interaction.options.getString('duration');
		if (!time) {
			await interaction.deferReply({ ephemeral: true });
			return interaction.editReply({
				content: `Currently Slowmode is ${
					interaction.channel.rateLimitPerUser
						? `${new DurationFormatter().format(interaction.channel.rateLimitPerUser * 1000)}`
						: 'disabled'
				}`
			});
		}
		if (!isNaN(Number(time))) time += 's';
		const duration = new Duration(time).offset;
		if (isNaN(duration))
			return interaction.reply({
				content: `${Emojis.Cross} Invalid duration! Valid examples: \`1h\`, \`1m\`, \`1s\`, \`2 hours\`\nTo remove slowmode just put \`0\` as the duration.`,
				ephemeral: true
			});

		const MAX_SLOWMODE_DURATION = new Duration('6hr').offset;
		if (duration > MAX_SLOWMODE_DURATION) {
			return interaction.reply({
				content: `${Emojis.Cross} You cannot set slowmode for more than 6hrs!`
			});
		}
		let content = `${Emojis.Confirm} Set the slowmode for ${new DurationFormatter().format(duration)} in ${interaction.channel}`;
		if (duration === 0) {
			content = `${Emojis.Confirm} Removed slowmode from ${interaction.channel}`;
		}
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;

		await interaction.channel.setRateLimitPerUser(Math.floor(duration / 1000), reason);
		await interaction.reply({ content });
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
					.addStringOption((option) =>
						option //
							.setName('duration')
							.setDescription('The amount of time to set the slowmode to, enter 0 to turn off')
							.setRequired(false)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the slowmode')
							.setRequired(false)
					),
			{ idHints: ['954799793559986296', '1019932175539384320'] }
		);
	}
}
