import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { type BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { type APIApplicationCommandOptionChoice, PermissionFlagsBits } from 'discord-api-types/v9';
import { InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Quickly bans and unbans, acts as a quick purge`,
	cooldownDelay: sec(15),
	cooldownLimit: 2,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BanMembers']
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
		await interaction.deferReply({ flags: MessageFlags.Ephemeral, withResponse: true });
		const member = interaction.options.getMember('target');
		const dm = interaction.options.getBoolean('dm') ?? false;

		if (!member)
			return interaction.editReply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`
			});
		const reason = interaction.options.getString('reason') ?? undefined;
		const days = interaction.options.getInteger('days') ?? 1;

		const { content: ctn, result } = runAllChecks(interaction.member, member, 'soft ban');
		if (!result) return interaction.editReply(ctn);

		let content = `${Emojis.Confirm} ${member} has been soft banned ${reason ? `for the following reason: ${reason}` : ''}`;

		await member.ban({ deleteMessageSeconds: 24 * 60 * 60 * days, reason });

		await interaction.guild.members.unban(member.id, reason);

		if (dm) {
			await member
				.send({
					content: `You have been soft banned from ${interaction.guild.name}\n${reason ? `Reason: ${reason}` : ''}`
				})
				.catch(() => (content += `\n\n> ${Emojis.Cross} Couldn't DM member!`));
		}

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
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
					.addUserOption((option) =>
						option //
							.setName('target')
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
					)
					.addBooleanOption((option) =>
						option //
							.setName('dm')
							.setDescription('Send a DM to the timed out user (default: false)')
							.setRequired(false)
					),
			{ idHints: ['948096163398160415', '1019931997696708739'] }
		);
	}
}

type Days = 1 | 2 | 3 | 4 | 5 | 6 | 7;
