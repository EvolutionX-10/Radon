import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(15),
	description: `Deletes messages from current channel`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MANAGE_MESSAGES'],
	runIn: ['GUILD_ANY']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });
		const count = interaction.options.getInteger('count', true);
		const channel = interaction.channel as TextChannel;
		const pinned = interaction.options.getBoolean('skip_pinned', false) ?? true;
		const contains = interaction.options.getString('contains', false);
		const user = interaction.options.getUser('user', false);
		let dels = 0;
		const content = `No messages were deleted! Try filtering correctly\nNote that the messages are older than 2 weeks will NOT be deleted!`;
		if (count > 100) {
			const arr = summableArray(count, 100);
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
							.setDescription('Skip pinned messages')
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
// async function wait(ms: number) {
//     const wait = (await import('util')).promisify(setTimeout);
//     return wait(ms);
// }
/**
 * Creates an array of `part`s up to the `maximum`
 * @param maximum The maximum reached at which the function should stop adding new elements to the array.
 * @param part The value of which each element of the array should be, with the remainder up to the maximum being the last entry of the array.
 * @returns An array of `part`s with the remainder being whatever of a `part` did not fit within the boundaries set by `max`.
 */
function summableArray(maximum: number, part: number) {
	const arr = [];
	let current = 0;

	while (current < maximum) {
		const next = Math.min(part, maximum - current);
		arr.push(next);
		current += next;
	}

	return arr;
}
