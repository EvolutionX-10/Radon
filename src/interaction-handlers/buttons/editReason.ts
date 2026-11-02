import { v2 } from '../../lib/presentation/components.js';
import { isModerationStaff } from '../../lib/moderation/authorization.js';
import { RadonButtonInteraction } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Row } from '#lib/structures';
import { readModlog } from '../../lib/presentation/modlog.js';

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
		if (!interaction.guild) return;
		const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
		if (!(await isModerationStaff(member, this.container.prisma)))
			return interaction.reply(v2({ content: 'Only configured moderation staff can edit reasons.', ephemeral: true }, 'Moderation log'));
		const { messageId } = result;

		const message = interaction.message;
		if (!message || message.id !== messageId || message.author.id !== interaction.client.user.id) {
			return interaction.reply(
				v2(
					{
						content: `This message isn't from me hence I can't edit!`,
						ephemeral: true
					},
					'Moderation log'
				)
			);
		}

		const modal = new ModalBuilder() //
			.setCustomId(`@edit_reason/${interaction.channelId}/${messageId}`)
			.setTitle('Edit Reason');

		const log = readModlog(message);
		const reason = log?.description?.startsWith('```') ? undefined : log?.description?.trim();

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
