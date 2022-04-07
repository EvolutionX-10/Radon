import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(15),
	description: `Deletes messages from current channel`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['MANAGE_MESSAGES'],
	runIn: ['GUILD_ANY']
})
export class UserCommand extends RadonCommand {
	public async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });
		const count = interaction.options.getInteger('count', true);
		const channel = interaction.channel as TextChannel;
		const pinned = interaction.options.getBoolean('skip_pinned', false) ?? false;
		const contains = interaction.options.getString('contains', false);
		const user = interaction.options.getUser('user', false);
		let dels = 0;
		const content = `No messages were deleted! Try filtering correctly\n` + `Note that the messages are older than 2 weeks will NOT be deleted!`;
		if (count > 100) {
			const arr = summableArray(count, 100);
			const p = new Promise((resolve: (value: void) => void) => {
				arr.forEach(async (num, i, ar) => {
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
						if (i === ar.length - 1) resolve();
					}, 5000 * i);
				});
			});
			p.then(async () => {
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
	public async registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'count',
						description: 'Number of messages to delete',
						minValue: 1,
						maxValue: 500,
						type: Constants.ApplicationCommandOptionTypes.INTEGER,
						required: true
					},
					{
						name: 'skip_pinned',
						description: 'Whether to skip pinned messages [default: false]',
						type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
						required: false
					},
					{
						name: 'contains',
						description: `A string to search for in messages`,
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false
					},
					{
						name: 'user',
						description: 'User to delete messages from',
						type: Constants.ApplicationCommandOptionTypes.USER,
						required: false
					}
				]
			},
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
