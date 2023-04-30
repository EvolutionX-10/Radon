import { Emojis } from '#constants';
import {
	type APIButtonComponentWithCustomId,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Collection,
	type ColorResolvable,
	type ComponentEmojiResolvable,
	ComponentType,
	Message,
	User
} from 'discord.js';
import { Button } from './Button.js';
import { Embed } from './Embed.js';
import { Row } from './Row.js';

export class Confirmation {
	public options: ConfirmationOptions;

	public buttons: Button[];

	public constructor(options: ConfirmationOptions) {
		this.options = options;
		this.buttons = [];

		if (options.emojis && options?.emojis?.length !== 2) {
			throw new Error('Confirmation requires 2 emojis');
		}
		if (options.buttonLabels && options?.buttonLabels?.length !== 2) {
			throw new Error('Confirmation requires 2 button labels');
		}
	}

	public setButtons(buttons: [ButtonPrompt, ButtonPrompt]) {
		if (buttons.length !== 2) {
			throw new Error('Confirmation requires at least 2 buttons');
		}

		// Thanks @jacoobes
		this.buttons = Array(2)
			.fill(null)
			.map((_, i) =>
				new Button()
					._customId(buttons[i].customId)
					._label(buttons[i].label ?? '')
					._emoji(buttons[i].emoji ?? '')
					._style(buttons[i].style)
			);
		return this;
	}

	public async run(message: Message | ChatInputCommandInteraction<'cached'>, user?: User) {
		const id = user ? user.id : message instanceof Message ? message.author.id : message.user.id;
		const default_embed = new Embed()
			._author({
				name: message instanceof Message ? message.author.tag : message.user.tag,
				iconURL:
					message instanceof Message
						? message.author.displayAvatarURL({ forceStatic: false })
						: message.user.displayAvatarURL({ forceStatic: false })
			})
			._color(this.options?.color || 0x00ae86)
			._description(`Are you sure you want to proceed?`);
		const embed = this.options?.embed || default_embed;
		const emojis = this.options?.emojis || [Emojis.Confirm, Emojis.Cross];
		const buttonLabels = this.options?.buttonLabels || ['Yes', 'No'];
		const row = new Row<ButtonBuilder>();
		const yes_button = new Button()._customId('yes')._label(buttonLabels[0])._emoji(emojis[0])._style(ButtonStyle.Success);

		const no_button = new Button()._customId('no')._label(buttonLabels[1])._emoji(emojis[1])._style(ButtonStyle.Danger);
		this.buttons = this.buttons.length ? this.buttons : [yes_button, no_button];

		row._components(this.buttons);
		let msg: Message<boolean>;
		if (message instanceof Message) {
			msg = await message.channel.send({
				content: this.options.content,
				embeds: this.options?.content ? [] : [embed],
				components: [row]
			});
		} else {
			msg = (await message.reply({
				content: this.options.content,
				embeds: this.options?.content ? [] : [embed],
				components: [row],
				fetchReply: true,
				ephemeral: this.options.ephemeral
			})) as Message;
		}

		const collector = msg.createMessageComponentCollector({
			time: this.options.time || 60_000,
			componentType: ComponentType.Button
		});

		collector.on('collect', async (i) => {
			row.components.map((b) => b.setDisabled());
			if (id !== i.user.id) {
				await i.reply({
					content: this.options.wrongUserResponse ?? 'Not for you!',
					ephemeral: true
				});
				return;
			}
			await i.update({ components: [row] });
			if (i.customId === (this.buttons[0].data as APIButtonComponentWithCustomId).custom_id) {
				await this.options.onConfirm({ i, msg });
			} else if (i.customId === (this.buttons[1].data as APIButtonComponentWithCustomId).custom_id) {
				await this.options.onCancel({ i, msg });
			}
		});

		collector.on('end', async (c) => {
			if (this.options.onEnd) {
				return this.options.onEnd({ collection: c, msg });
			}
			if (c.filter((b) => b.user.id === id)?.size === 0) {
				row.components.map((b) => b.setDisabled());
				await msg.edit({
					content: this.options.content ? 'No response received.' : null,
					embeds: this.options.content ? [] : [embed.setDescription('No response received.')],
					components: [row]
				});
			}
		});
		return collector;
	}
}

interface ConfirmationOptions {
	/**
	 * By default embed is present, but a custom embed is possible with this
	 */
	embed?: Embed;
	/**
	 * To use compact confirmation, use content which does not send embed but only text
	 */
	content?: string;
	/**
	 * Button labels are by default Yes and No, but can be customized
	 */
	buttonLabels?: [string, string];
	/**
	 * Radon uses default emojis for confirmation, but custom can be added
	 */
	emojis?: [string, string];
	/**
	 * Default time is 1 minute
	 */
	time?: number;
	/**
	 * Default embed color is 0x00ae86
	 */
	color?: ColorResolvable;
	/**
	 * If you want to use a custom response when user clicks on a wrong button
	 */
	wrongUserResponse?: string;
	/**
	 * If you want the confirmation to be ephemeral
	 */
	ephemeral?: boolean;

	onConfirm: (payload: payload) => Promise<void> | unknown;
	onCancel: (payload: payload) => Promise<void> | unknown;
	onEnd?: (payload: endPayload) => void;
}

interface payload {
	i: ButtonInteraction;
	msg: Message;
}

interface endPayload {
	collection: Collection<string, ButtonInteraction>;
	msg: Message;
}

interface ButtonPrompt {
	customId: string;
	label?: string;
	emoji?: ComponentEmojiResolvable;
	style: Exclude<ButtonStyle, ButtonStyle.Link>;
}
