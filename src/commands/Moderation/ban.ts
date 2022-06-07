import { Confirmation, RadonCommand } from '#lib/structures';
import { BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { generateModLogDescription, runAllChecks, sec, severity } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember, TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	description: `Ban a member`,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['BAN_MEMBERS'],
	runIn: 'GUILD_ANY'
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member)
			return interaction.reply({
				content: `${vars.emojis.cross} You must specify a valid member`,
				ephemeral: true
			});
		const reason = interaction.options.getString('reason') ?? undefined;
		const days = interaction.options.getInteger('days') ?? 0;

		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'ban');
		if (!result) return interaction.reply({ content: ctn, ephemeral: true });

		const confirm = new Confirmation({
			content: `Are you sure you want to ban ${member.user.tag}?${reason ? `\nReason: ${reason}` : ''}`,
			ephemeral: (interaction.channel as TextChannel).visible(),
			onConfirm: async () => {
				await this.ban(interaction, member, reason, days);
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
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'member',
						description: 'The member to ban',
						type: Constants.ApplicationCommandOptionTypes.USER,
						required: true
					},
					{
						name: 'reason',
						description: 'The reason for the ban',
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false
					},
					{
						name: 'days',
						description: 'The days of messages to delete (not a temp ban)',
						type: Constants.ApplicationCommandOptionTypes.INTEGER,
						maxValue: 7,
						minValue: 1,
						required: false
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['947756361876389898', '951679301030387742']
			}
		);
	}

	private async ban(interaction: RadonCommand.ChatInputCommandInteraction, member: GuildMember, reason: string | undefined, days: number) {
		let content = `${vars.emojis.confirm} ${member} [${member.user.username}] has been banned ${
			reason ? `for the following reason: ${reason}` : ''
		}\nhttps://tenor.com/view/11035060`;

		await member
			.send({
				content: `You have been banned from ${interaction.guild!.name}\n${reason ? `Reason: ${reason}` : ''}`
			})
			.catch(() => (content += `\n${vars.emojis.cross} Couldn't DM member!`));
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

		return interaction.editReply({
			content
		});
	}
}
