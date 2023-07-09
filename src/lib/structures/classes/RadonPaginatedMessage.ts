import { Emojis } from '#constants';
import { PaginatedMessage, type PaginatedMessageOptions } from '@sapphire/discord.js-utilities';
import { type APIStringSelectComponent, ButtonStyle, ComponentType, MessageComponentInteraction } from 'discord.js';
/**
 * Extends Paginated message with custom order
 */
export class RadonPaginatedMessage extends PaginatedMessage {
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

	private updateComponents(handler: PaginatedMessage, interaction: MessageComponentInteraction) {
		const page = handler.messages[handler.index]!;
		const { options } = interaction.message.components![1].components[0] as unknown as APIStringSelectComponent;
		for (const option of options) {
			if (option.value === `${handler.index}`) option.default = true;
			else option.default = false;
		}
		page.components = interaction.message.components;
	}
}
