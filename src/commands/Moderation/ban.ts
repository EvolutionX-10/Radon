import { Confirmation, RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { generateModLogDescription, runAllChecks, sec, severity } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v9';
import type { GuildMember, TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	description: `Ban a member`,
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
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member)
			return interaction.reply({
				content: `${vars.emojis.cross} You must specify a valid member`,
				ephemeral: true
			});
		const reason = interaction.options.getString('reason') ?? undefined;
		const days = interaction.options.getInteger('days') ?? 0;
		const dm = interaction.options.getBoolean('dm') ?? false;

		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'ban');
		if (!result) return interaction.reply({ content: ctn, ephemeral: true });

		const confirm = new Confirmation({
			content: `Are you sure you want to ban ${member.user.tag}?${reason ? `\nReason: ${reason}` : ''}`,
			ephemeral: (interaction.channel as TextChannel).visible(),
			onConfirm: async () => {
				await this.ban(interaction, member, reason, days, dm);
			},
			onCancel: ({ i }) => {
				return i.editReply({
					content: `${vars.emojis.cross} Wow careful, stopped the ban hammer at the last moment!`
				});
			}
		});
		await confirm.run(interaction);
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
							.setDescription('The member to ban')
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
							.setDescription('Send a DM to the banned member (default: false)')
							.setRequired(false)
					)
					.addIntegerOption((option) =>
						option //
							.setName('days')
							.setDescription('The days of messages from member to delete (not a temp ban)')
							.setRequired(false)
							.setChoices(...this.#DaysChoices)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['947756361876389898', '951679301030387742']
			}
		);
	}

	private async ban(
		interaction: RadonCommand.ChatInputCommandInteraction,
		member: GuildMember,
		reason: string | undefined,
		days: number,
		dm = false
	) {
		let content = `${vars.emojis.confirm} ${member.user.tag} has been [banned](https://tenor.com/view/11035060) ${
			reason ? `for the following reason: ${reason}` : ''
		}`;

		if (dm) {
			await member
				.send({
					content: `You have been banned from ${interaction.guild!.name}\n${reason ? `Reason: ${reason}` : ''}`
				})
				.catch(() => (content += `\n${vars.emojis.cross} Couldn't DM member!`));
		}

		await member.ban({
			days,
			reason
		});

		const data: BaseModActionData = {
			moderator: interaction.member as GuildMember,
			target: member,
			reason,
			action: 'ban'
		};

		const embed = this.container.utils
			.embed()
			._color(severity.ban)
			._author({
				name: interaction.user.tag,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			});
		const description = generateModLogDescription({
			member,
			action: 'Ban',
			reason
		});
		embed._description(description);

		if (await interaction.guild!.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		return interaction.editReply(content);
	}
}

type Days = 1 | 2 | 3 | 4 | 5 | 6 | 7;
