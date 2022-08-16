import { Emojis } from '#constants';
import { PaginatedMessageEmbedFields, PaginatedMessageOptions } from '@sapphire/discord.js-utilities';
import { Constants } from 'discord.js';

export class RadonPaginatedMessageEmbedFields extends PaginatedMessageEmbedFields {
	public constructor(options: PaginatedMessageOptions = {}) {
		super(options);
		this.setActions([
			{
				customId: '@sapphire/paginated-messages.goToPage',
				type: Constants.MessageComponentTypes.SELECT_MENU,
				run: ({ handler, interaction }) => interaction.isSelectMenu() && (handler.index = parseInt(interaction.values[0], 10))
			},
			{
				customId: '@sapphire/paginated-messages.firstPage',
				style: 'SECONDARY',
				emoji: Emojis.Backward,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => (handler.index = 0)
			},
			{
				customId: '@sapphire/paginated-messages.previousPage',
				style: 'SECONDARY',
				emoji: Emojis.Left,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => {
					if (handler.index === 0) {
						handler.index = handler.pages.length - 1;
					} else {
						--handler.index;
					}
				}
			},
			{
				customId: '@sapphire/paginated-messages.stop',
				style: 'SECONDARY',
				emoji: Emojis.Stop,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ collector }) => {
					collector.stop();
				}
			},
			{
				customId: '@sapphire/paginated-messages.nextPage',
				style: 'SECONDARY',
				emoji: Emojis.Right,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => {
					if (handler.index === handler.pages.length - 1) {
						handler.index = 0;
					} else {
						++handler.index;
					}
				}
			},
			{
				customId: '@sapphire/paginated-messages.goToLastPage',
				style: 'SECONDARY',
				emoji: Emojis.Forward,
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => (handler.index = handler.pages.length - 1)
			}
		]);
	}
}
