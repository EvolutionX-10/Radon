import { Emojis } from '#constants';
import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels, RadonEvents, TimeoutActionData } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Duration, DurationFormatter } from '@sapphire/time-utilities';

@ApplyOptions<RadonCommand.Options>({
	description: `Temporarily mute a member`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MODERATE_MEMBERS']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		const member = interaction.options.getMember('member');
		if (!member)
			return interaction.editReply({
				content: 'No member found!'
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
				content: 'Invalid duration! Valid examples: `1d`, `1h`, `1m`, `1s`\nTo remove a timeout just put `0` as the duration.'
			});

		const MAX_TIMEOUT_DURATION = new Duration('28d').offset;

		if (duration > MAX_TIMEOUT_DURATION) {
			return interaction.editReply({
				content: 'You cannot timeout a user for more than 28 days!'
			});
		}
		let content = `${Emojis.Confirm} ${member.user.tag} has been timed out for ${new DurationFormatter().format(duration)}`;
		const reason = interaction.options.getString('reason') ?? undefined;
		await member.timeout(duration, reason);
		if (duration !== 0) {
			await member
				.send({
					content: `You have been timed out for ${new DurationFormatter().format(duration)}!\nServer: ${interaction.guild.name}`
				})
				.catch(() => (content += `\n${Emojis.Cross} Couldn't DM the member!`));
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

		if (duration === 0) content = `${Emojis.Confirm} Removed timeout from ${member.user.tag}`;
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
							.setName('member')
							.setDescription('The member to timeout')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('duration')
							.setDescription('The duration of the timeout')
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
