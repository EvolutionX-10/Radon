import { RadonButtonInteraction } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Row } from '#lib/structures';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class EditReasonButtonHandler extends InteractionHandler {
	public override async parse(interaction: RadonButtonInteraction) {
		if (!interaction.customId.startsWith('edit_reason:')) return this.none();

		const messageId = interaction.customId.replace('edit_reason:', '');
		return this.some({ messageId });
	}

	public override async run(interaction: RadonButtonInteraction, result: InteractionHandler.ParseResult<this>) {
		const { messageId } = result;

		const message = interaction.message;
		if (!message || message.author.id !== interaction.client.user.id) {
			return interaction.reply({
				content: `This message isn't from me hence I can't edit!`,
				ephemeral: true
			});
		}

		const modal = new ModalBuilder() //
			.setCustomId(`@edit_reason/${interaction.channelId}/${messageId}`)
			.setTitle('Edit Reason');

		let reason;
		if (message.embeds[0].description?.startsWith('```')) reason = undefined;
		else reason = message.embeds[0].description?.trim();

		const reasonInput = new TextInputBuilder()
			.setLabel('Reason')
			.setCustomId('reason')
			.setMaxLength(512)
			.setValue(reason ?? '')
			.setPlaceholder('Enter the new reason')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true);

		const row = new Row<TextInputBuilder>()._components(reasonInput);

		modal.setComponents(row);

		return interaction.showModal(modal);
	}
}
