import { Emojis } from '#constants';
import { PaginatedMessage, PaginatedMessageOptions, PaginatedMessagePage } from '@sapphire/discord.js-utilities';
import { Constants } from 'discord.js';
/**
 * Extends Paginated message with custom order and no select menus
 * as well as unlimited pages
 */
export class JustButtons extends PaginatedMessage {
	public constructor(options: PaginatedMessageOptions = {}) {
		super(options);
		this.setActions([
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
				run: ({ collector }) => collector.stop()
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

	public override addPage(page: PaginatedMessagePage): this {
		this.pages.push(page);
		return this;
	}
}
