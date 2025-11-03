import { Embed } from '#lib/structures';
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

		if (!message.embeds[0].description) return;

		await interaction.deferUpdate();

		await message.edit({
			embeds: [new Embed(message.embeds[0].data)._description(result.reason)]
		});

		if (message.embeds[0].title === 'Warn') {
			const id = this.getID(message);
			if (id) {
				const member = await interaction.guild.members.fetch(id.memberID!).catch(() => null);
				if (member) {
					await this.updateReason(member, id.warnID!, result.reason);
				}
			}
		}
	}

	public override parse(interaction: ModalSubmitInteraction<'cached'>) {
		const { customId } = interaction;

		if (!customId.startsWith('@edit_reason')) return this.none();

		const reason = interaction.fields.getTextInputValue('reason');

		const [, channelId, messageId] = customId.split('/');
		const channel = interaction.guild.channels.cache.get(channelId);

		if (!channel || !channel.isTextBased()) return this.none();

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
		const memberID = embed.fields[1].value.split(' ')[2].match(/\[?(\d+)\]/);
		const warnID = embed.fields[3].value.split(' ')[1].match(/\`?(.+)\`/);

		if (!memberID?.length || !warnID?.length) return;

		return {
			warnID: warnID[1],
			memberID: memberID[1]
		};
	}
}
