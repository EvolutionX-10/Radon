import type { Collection, Snowflake } from 'discord.js';
import { componentPage, endComponentPagination, updatePageMenu } from '../../presentation/pagination.js';
import { Emojis } from '#constants';
import {
	type PaginatedMessageStopReasons,
	type PaginatedMessageInteractionUnion,
	PaginatedMessage,
	PaginatedMessageEmbedFields,
	type PaginatedMessageOptions
} from '@sapphire/discord.js-utilities';
import { ButtonStyle, ComponentType } from 'discord.js';

export class RadonPaginatedMessageEmbedFields extends PaginatedMessageEmbedFields {
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
				customId: '@sapphire/paginated-messages.goToPage',
				type: ComponentType.StringSelect,
				options: this.pages.map((_, i) => ({
					label: `${i + 1}`,
					value: `${i}`,
					default: i === 0
				})),
				run: ({ handler, interaction }) => {
					if (!interaction.isStringSelectMenu()) return;
					handler.index = parseInt(interaction.values[0], 10);
					this.updateComponents(handler, interaction);
				}
			},
			{
				customId: '@sapphire/paginated-messages.firstPage',
				style: ButtonStyle.Secondary,
				emoji: Emojis.Backward,
				type: ComponentType.Button,
				run: ({ handler, interaction }) => {
					handler.index = 0;
					this.updateComponents(handler, interaction);
				}
			},
			{
				customId: '@sapphire/paginated-messages.previousPage',
				style: ButtonStyle.Secondary,
				emoji: Emojis.Left,
				type: ComponentType.Button,
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
				style: ButtonStyle.Secondary,
				emoji: Emojis.Forward,
				type: ComponentType.Button,
				run: ({ handler, interaction }) => {
					handler.index = handler.pages.length - 1;
					this.updateComponents(handler, interaction);
				}
			}
		]);
	}

	private updateComponents(handler: PaginatedMessage, _interaction: unknown) {
		updatePageMenu(handler);
	}
}
