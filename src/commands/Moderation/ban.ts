import { Emojis } from '#constants';
import { Confirmation, RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { APIApplicationCommandOptionChoice, PermissionFlagsBits } from 'discord-api-types/v9';
import type { User } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Ban a user`,
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BAN_MEMBERS']
})
export class UserCommand extends RadonCommand {
	readonly #DaysChoices: APIApplicationCommandOptionChoice<Days>[] = [
		{ name: '1 Day', value: 1 },
		{ name: '2 Days', value: 2 },
		{ name: '3 Days', value: 3 },
		{ name: '4 Days', value: 4 },
		{ name: '5 Days', value: 5 },
		{ name: '6 Days', value: 6 },
		{ name: '7 Days', value: 7 }
	];

	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const user = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason') ?? undefined;
		const days = interaction.options.getInteger('days') ?? 0;
		const dm = interaction.options.getBoolean('dm') ?? false;

		const { content: ctn, result } = runAllChecks(interaction.member, user, 'ban');
		if (!result) return interaction.reply({ content: ctn, ephemeral: true });

		const confirm = new Confirmation({
			content: `Are you sure you want to ban ${user}? ${reason ? `\nReason: ${reason}` : ''}`,
			onConfirm: async () => {
				await this.ban(interaction, user, reason, days, dm);
			},
			onCancel: ({ i }) => {
				return i.editReply({
					content: `${Emojis.Cross} Wow careful, stopped the ban hammer at the last moment!`
				});
			}
		});
		return confirm.run(interaction);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false)
					.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
					.addUserOption((option) =>
						option //
							.setName('user')
							.setDescription('The user to ban (You can enter ID as well)')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the ban')
							.setRequired(false)
					)
					.addBooleanOption((option) =>
						option //
							.setName('dm')
							.setDescription('Send a DM to the banned user (default: false)')
							.setRequired(false)
					)
					.addIntegerOption((option) =>
						option //
							.setName('days')
							.setDescription('The days of messages from user to delete (not a temp ban)')
							.setRequired(false)
							.setChoices(...this.#DaysChoices)
					),
			{ idHints: ['947756361876389898', '1019931914922115133'] }
		);
	}

	private async ban(interaction: RadonCommand.ChatInputCommandInteraction, user: User, reason: string | undefined, days: number, dm = false) {
		let content = `${Emojis.Confirm} ${user} has been [banned](https://tenor.com/view/11035060) ${
			reason ? `for the following reason: __${reason}__` : ''
		}`;

		if (dm) {
			await user
				.send({
					content: `You have been banned from ${interaction.guild.name}\n${reason ? `Reason: ${reason}` : ''}`
				})
				.catch(() => (content += `\n\n> ${Emojis.Cross} Couldn't DM user!`));
		}

		await interaction.guild.bans.create(user, { days, reason });

		const data: BaseModActionData = {
			moderator: interaction.member,
			target: user,
			reason,
			action: 'ban'
		};

		if (await interaction.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		return interaction.editReply(content);
	}
}

type Days = 1 | 2 | 3 | 4 | 5 | 6 | 7;
