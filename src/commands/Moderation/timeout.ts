import { Emojis } from '#constants';
import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels, RadonEvents, TimeoutActionData } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Duration, DurationFormatter } from '@sapphire/duration';

@ApplyOptions<RadonCommand.Options>({
	description: `Temporarily mute a member`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MODERATE_MEMBERS']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ fetchReply: true });
		const member = interaction.options.getMember('target');
		if (!member)
			return interaction.editReply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`
			});

		const { content: ctn, result } = runAllChecks(interaction.member, member, 'timeout');
		if (!result || member.user.bot)
			return interaction.editReply({
				content: ctn || `${Emojis.Cross} I can't perform timeout on bots!`
			});

		let time = interaction.options.getString('duration', true);
		if (!isNaN(Number(time))) time += 's';
		const duration = new Duration(time).offset;
		if (isNaN(duration))
			return interaction.editReply({
				content: `${Emojis.Cross} Invalid duration! Valid examples: \`1d\`, \`1h\`, \`1m\`, \`1s\`\nTo remove a timeout just put \`0\` as the duration.`
			});

		const MAX_TIMEOUT_DURATION = new Duration('28d').offset;

		if (duration > MAX_TIMEOUT_DURATION) {
			return interaction.editReply({
				content: `${Emojis.Cross} You cannot timeout a member for more than 28 days!`
			});
		}

		if (duration === 0 && !member.isCommunicationDisabled()) {
			return interaction.editReply({
				content: `${Emojis.Cross} ${member} is not on timeout!`
			});
		}

		let content = `${Emojis.Confirm} ${member} has been timed out for ${new DurationFormatter().format(duration)}`;

		const reason = interaction.options.getString('reason') ?? undefined;
		await member.timeout(duration, reason);

		if (duration !== 0) {
			await member
				.send({
					content: `You have been timed out for ${new DurationFormatter().format(duration)}!\nServer: ${interaction.guild.name}`
				})
				.catch(() => (content += `\n\n> ${Emojis.Cross} Couldn't DM the member!`));
		}

		const data: TimeoutActionData = {
			moderator: interaction.member,
			target: member,
			reason,
			action: 'timeout',
			duration: new Timestamp(Date.now() + duration)
		};

		if ((await interaction.guild.settings?.modlogs.modLogs_exist()) && duration !== 0) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		if (duration === 0) content = `${Emojis.Confirm} Removed timeout from ${member}`;
		return interaction.editReply(content);
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
							.setDescription('The member to timeout')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('duration')
							.setDescription('The duration of the timeout (Enter 0 to remove timeout)')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the timeout')
							.setRequired(true)
					),
			{ idHints: ['948096165017169943', '1019931999743512616'] }
		);
	}
}
