import { Emojis } from '#constants';
import { PaginatedMessage, PaginatedMessageEmbedFields, PaginatedMessageOptions } from '@sapphire/discord.js-utilities';
import type { APISelectMenuComponent } from 'discord-api-types/v9';
import { Constants, MessageComponentInteraction } from 'discord.js';

export class RadonPaginatedMessageEmbedFields extends PaginatedMessageEmbedFields {
	public constructor(options: PaginatedMessageOptions = {}) {
		super(options);
		this.setActions([
			{
				customId: '@sapphire/paginated-messages.goToPage',
				type: Constants.MessageComponentTypes.SELECT_MENU,
				run: ({ handler, interaction }) => {
					if (!interaction.isSelectMenu()) return;
					handler.index = parseInt(interaction.values[0], 10);
					this.updateComponents(handler, interaction);
				}
			},
			{
				customId: '@sapphire/paginated-messages.firstPage',
				style: 'SECONDARY',
				emoji: Emojis.Backward,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler, interaction }) => {
					handler.index = 0;
					this.updateComponents(handler, interaction);
				}
			},
			{
				customId: '@sapphire/paginated-messages.previousPage',
				style: 'SECONDARY',
				emoji: Emojis.Left,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler, interaction }) => {
					if (handler.index === 0) {
						handler.index = handler.pages.length - 1;
					} else {
						--handler.index;
					}
					this.updateComponents(handler, interaction);
				}
			},
			{
				customId: '@sapphire/paginated-messages.stop',
				style: 'SECONDARY',
				emoji: Emojis.Stop,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ collector }) => collector.stop()
			},
			{
				customId: '@sapphire/paginated-messages.nextPage',
				style: 'SECONDARY',
				emoji: Emojis.Right,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler, interaction }) => {
					if (handler.index === handler.pages.length - 1) {
						handler.index = 0;
					} else {
						++handler.index;
					}
					this.updateComponents(handler, interaction);
				}
			},
			{
				customId: '@sapphire/paginated-messages.goToLastPage',
				style: 'SECONDARY',
				emoji: Emojis.Forward,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler, interaction }) => {
					handler.index = handler.pages.length - 1;
					this.updateComponents(handler, interaction);
				}
			}
		]);
	}

	private updateComponents(handler: PaginatedMessage, interaction: MessageComponentInteraction) {
		const page = handler.messages[handler.index]!;
		const options = (interaction.message.components![1].components[0] as APISelectMenuComponent).options;
		for (const option of options) {
			if (option.value === `${handler.index}`) option.default = true;
			else option.default = false;
		}
		// @ts-expect-error
		page.components = interaction.message.components;
	}
}
