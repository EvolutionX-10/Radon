import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { GuildMember, Message, ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override async run(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const message = await result.channel.messages.fetch(result.messageId);

		if (!message || !interaction.guild) return;

		const regex = /(\*\*Reason\*\*: )(?:.+)/gim;

		if (!message.embeds[0].description) return;

		message.embeds[0].description = message.embeds[0].description?.replace(regex, `$1${result.reason}`);

		await message.edit({ embeds: message.embeds });

		if (message.embeds[0].description.includes('**Action**: Warn\n')) {
			const id = this.getID(message);

			const member = await interaction.guild.members.fetch(id!.memberID!).catch(() => null);
			if (member) {
				await this.updateReason(member, id!.warnID!, result.reason);
			}
		}

		return interaction.reply({ content: `Successfully updated the reason!` });
	}

	public override parse(interaction: ModalSubmitInteraction) {
		const { customId } = interaction;

		if (!customId.startsWith('@reason')) return this.none();

		const reason = interaction.fields.getTextInputValue('reason');

		const [, channelId, messageId] = customId.split('/');
		const channel = interaction.guild!.channels.cache.get(channelId);

		if (!channel || !channel.isText()) return this.none();

		return this.some({ reason, channel, messageId });
	}

	private async updateReason(member: GuildMember, id: string, reason: string) {
		const warns = await member.guild.settings?.warns.get(member);
		if (!warns || !warns?.doc || !warns?.person) return;
		const warn = warns.person.warns.find((warn) => warn.id === id);
		if (!warn) return;
		warn.reason = reason;

		warns.doc.warnlist.forEach((person) => {
			if (person.id === member.id) person.warns = warns.person.warns;
		});

		return member.guild.settings?.warns.update(warns.doc.warnlist);
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
