import { RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { GuildIds, Emojis } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v9';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(15),
	cooldownLimit: 2,
	description: `Quickly bans and unbans, acts as a quick purge`,
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

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		const member = interaction.options.getMember('member');
		if (!member)
			return interaction.editReply({
				content: `${Emojis.Cross} You must specify a valid member`
			});
		const reason = interaction.options.getString('reason') ?? undefined;
		const days = interaction.options.getInteger('days') ?? 1;

		const { content: ctn, result } = runAllChecks(interaction.member, member, 'soft ban');
		if (!result) return interaction.editReply(ctn);
		const content = `${Emojis.Confirm} ${member.user.tag} has been soft banned ${reason ? `for the following reason: ${reason}` : ''}`;
		const { id } = member;

		await member.ban({
			days,
			reason
		});

		await interaction.guild.members.unban(id, reason);

		const data: BaseModActionData = {
			action: 'softban',
			moderator: interaction.member,
			target: member,
			reason
		};

		if (await interaction.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

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
							.setDescription('The member to soft ban')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the soft ban')
							.setRequired(false)
					)
					.addIntegerOption((option) =>
						option //
							.setName('days')
							.setDescription('The days of messages to delete (not a temp ban)')
							.setRequired(false)
							.setChoices(...this.#DaysChoices)
					),
			{
				guildIds: GuildIds,
				idHints: ['948096163398160415', '951679382991282186']
			}
		);
	}
}

type Days = 1 | 2 | 3 | 4 | 5 | 6 | 7;
