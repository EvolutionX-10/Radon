import type { Collection, Snowflake } from 'discord.js';
import { componentPage, endComponentPagination } from '../../presentation/pagination.js';
import { Emojis } from '#constants';
import {
	type PaginatedMessageStopReasons,
	type PaginatedMessageInteractionUnion,
	PaginatedMessage,
	type PaginatedMessageOptions,
	type PaginatedMessagePage
} from '@sapphire/discord.js-utilities';
import { ButtonStyle, ComponentType } from 'discord.js';
/**
 * Extends Paginated message with custom order and no select menus
 * as well as unlimited pages
 */
export class JustButtons extends PaginatedMessage {
	public override async resolvePage(...args: Parameters<PaginatedMessage['resolvePage']>) {
		return componentPage(this, await super.resolvePage(...args), args[2]);
	}
	protected override async handleEnd(_collected: Collection<Snowflake, PaginatedMessageInteractionUnion>, reason: PaginatedMessageStopReasons) {
		await endComponentPagination(this, reason);
	}

	public constructor(options: PaginatedMessageOptions = {}) {
		super(options);
		this.setActions([
			{
				customId: '@sapphire/paginated-messages.firstPage',
				style: ButtonStyle.Secondary,
				emoji: Emojis.Backward,
				type: ComponentType.Button,
				run: ({ handler }) => (handler.index = 0)
			},
			{
				customId: '@sapphire/paginated-messages.previousPage',
				style: ButtonStyle.Secondary,
				emoji: Emojis.Left,
				type: ComponentType.Button,
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
				style: ButtonStyle.Secondary,
				emoji: Emojis.Stop,
				type: ComponentType.Button,
				run: ({ collector }) => collector.stop()
			},
			{
				customId: '@sapphire/paginated-messages.nextPage',
				style: ButtonStyle.Secondary,
				emoji: Emojis.Right,
				type: ComponentType.Button,
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
				style: ButtonStyle.Secondary,
				emoji: Emojis.Forward,
				type: ComponentType.Button,
				run: ({ handler }) => (handler.index = handler.pages.length - 1)
			}
		]);
	}

	public override addPage(page: PaginatedMessagePage): this {
		this.pages.push(page);
		return this;
	}
}
