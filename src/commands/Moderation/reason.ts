import { RadonCommand } from '#lib/structures';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildMember, Message, TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	description: `Change the reason for the action`
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		const id = interaction.options.getString('id', true);
		const reason = interaction.options.getString('reason', true);
		if (!interaction.guild) return;
		const channelID = await interaction.guild.settings?.modlogs.modLogs_exist();
		if (!channelID) {
			return interaction.editReply({
				content: `The modlogs aren't set up for this server.\nPlease inform admins to use \`/setup\``
			});
		}
		const channel = (await interaction.guild.channels.fetch(channelID).catch(() => null)) as TextChannel;
		if (!channel) {
			return interaction.editReply({
				content: `The modlogs channel seems to be deleted.\nPlease inform admins to use \`/setup\``
			});
		}
		const message = await channel.messages.fetch(id).catch(() => null);
		if (!message) {
			return interaction.editReply({
				content: `The message seems to be deleted or the ID is invalid!`
			});
		}

		if (message.author.id !== this.container.client.user!.id) {
			return interaction.editReply({
				content: `This message isn't from me!`
			});
		}
		const regex = /(\*\*Reason\*\*: )(?:.+)/gim;
		if (!message.embeds[0].description) return;
		message.embeds[0].description = message.embeds[0].description?.replace(regex, `$1${reason}`);
		await message.edit({
			embeds: message.embeds
		});
		if (message.embeds[0].description.includes('**Action**: Warn')) {
			const id = this.getID(message);
			const member = await interaction.guild.members.fetch(id!.memberID!).catch(() => null);
			if (member) {
				await this.updateReason(member, id!.warnID!, reason);
			}
		}
		return interaction.editReply({
			content: `Successfully updated the reason!`
		});
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addStringOption((option) =>
						option //
							.setName('id')
							.setDescription('The ID of the message in the modlogs')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The updated reason for the action')
							.setRequired(true)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['952460616696741938', '952277309015093288']
			}
		);
	}

	private async updateReason(member: GuildMember, _id: string, _reason: string) {
		const warns = await member.guild.settings?.warns.get({ member });
		if (!warns || !warns?.doc || !warns?.person) return;
		const warn = warns.person.warns.find((warn) => warn.id === _id);
		if (!warn) return;
		warn.reason = _reason;
		return member.guild.settings?.warns.update({ member, warns: warns.person.warns });
	}

	private getID(message: Message) {
		const embed = message.embeds[0];
		if (!embed) return;
		const regexForMember = /`(?<MemberID>\d{17,19})`/gm;
		const regexForId = /(?:\*\*Warn ID\*\*: `)(?<warnID>.{17})(?:`)/gm;
		const match = regexForMember.exec(embed.description as string);
		const match2 = regexForId.exec(embed.description as string);

		if (!match?.length || !match2?.length) return;
		return {
			warnID: match2.groups?.warnID,
			memberID: match.groups?.MemberID
		};
	}
}
