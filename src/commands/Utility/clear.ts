import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(15),
	description: `Deletes messages from current channel`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MANAGE_MESSAGES']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });
		const count = interaction.options.getInteger('count', true);
		const { channel } = interaction;
		const pinned = interaction.options.getBoolean('skip_pinned', false) ?? true;
		const contains = interaction.options.getString('contains', false);
		const user = interaction.options.getUser('user', false);
		let dels = 0;
		const content = `No messages were deleted! Try filtering correctly\nNote that the messages are older than 2 weeks will NOT be deleted!`;
		if (count > 100) {
			const arr = this.container.utils.summableArray(count, 100);
			const p = new Promise((resolve: (value: unknown) => void) => {
				arr.forEach((num, i, ar) => {
					setTimeout(async () => {
						const messages = (
							await channel.messages.fetch({
								limit: num
							})
						)
							.filter((m) => (pinned ? !m.pinned : true))
							.filter((m) => (contains ? m.content.includes(contains) : true))
							.filter((m) => (user ? m.author.id === user.id : true));
						const { size } = await channel.bulkDelete(messages, true);
						dels += size;
						if (i === ar.length - 1) resolve('done');
					}, 5000 * i);
				});
			});

			void p.then(async () => {
				if (dels === 0) {
					await interaction.editReply(content);
				} else
					await interaction.editReply({
						content: `${vars.emojis.confirm} Deleted ${dels} messages`
					});
			});
		} else {
			const messages = (
				await channel.messages.fetch({
					limit: count
				})
			)
				.filter((m) => (pinned ? !m.pinned : true))
				.filter((m) => (contains ? m.content.includes(contains) : true))
				.filter((m) => (user ? m.author.id === user.id : true));
			const { size } = await channel.bulkDelete(messages, true);
			dels = size;
			if (dels === 0) {
				await interaction.editReply(content);
			} else
				await interaction.editReply({
					content: `${vars.emojis.confirm} Deleted ${dels} messages`
				});
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addIntegerOption((option) =>
						option //
							.setName('count')
							.setDescription('Number of messages to delete')
							.setRequired(true)
							.setMinValue(1)
							.setMaxValue(500)
					)
					.addBooleanOption((option) =>
						option //
							.setName('skip_pinned')
							.setDescription('Skip pinned messages [default: true]')
							.setRequired(false)
					)
					.addStringOption((option) =>
						option //
							.setName('contains')
							.setDescription('A string to search for in messages')
							.setRequired(false)
					)
					.addUserOption((option) =>
						option //
							.setName('user')
							.setDescription('User to delete messages from')
							.setRequired(false)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['947723986521956433', '951679388976545852']
			}
		);
	}
}
