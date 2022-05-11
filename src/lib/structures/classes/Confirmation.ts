import { vars } from '#vars';
import { ButtonInteraction, Collection, ColorResolvable, CommandInteraction, EmojiIdentifierResolvable, Message, User } from 'discord.js';
import { Button } from './Button.js';
import { Embed } from './Embed.js';
import { Row } from './Row.js';

export class Confirmation {
	public options: ConfirmationOptions;

	public buttons: Button[];

	public constructor(options: ConfirmationOptions) {
		this.options = options;
		this.buttons = [];

		if (options.emojis && options?.emojis?.length < 2) {
			throw new Error('Confirmation requires at least 2 emojis');
		}
		if (options.buttonLabels && options?.buttonLabels?.length < 2) {
			throw new Error('Confirmation requires at least 2 button labels');
		}
	}

	public setButtons(buttons: ButtonPrompt[]) {
		if (buttons.length < 2) {
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

	public async run(message: Message | CommandInteraction, user?: User) {
		const id = user ? user.id : message instanceof Message ? message.author.id : message.user.id;
		const default_embed = new Embed()
			._author({
				name: message instanceof Message ? message.author.tag : message.user.tag,
				iconURL:
					message instanceof Message ? message.author.displayAvatarURL({ dynamic: true }) : message.user.displayAvatarURL({ dynamic: true })
			})
			._color(this.options?.color || 0x00ae86)
			._description(`Are you sure you want to proceed?`);
		const embed = this.options?.embed || default_embed;
		const emojis = this.options?.emojis || [vars.emojis.confirm, vars.emojis.cross];
		const buttonLabels = this.options?.buttonLabels || ['Yes', 'No'];
		const row = new Row();
		const yes_button = new Button()._customId('yes')._label(buttonLabels[0])._emoji(emojis[0])._style('SUCCESS');

		const no_button = new Button()._customId('no')._label(buttonLabels[1])._emoji(emojis[1])._style('DANGER');
		this.buttons = this.buttons.length ? this.buttons : [yes_button, no_button];

		row._components(this.buttons);
		let msg: Message<boolean>;
		if (message instanceof Message) {
			msg = await message.channel.send({
				content: this.options.content || null,
				embeds: this.options?.content ? [] : [embed],
				components: [row]
			});
		} else {
			msg = (await message.reply({
				content: this.options.content || null,
				embeds: this.options?.content ? [] : [embed],
				components: [row],
				fetchReply: true
			})) as Message;
		}

		const collector = msg.createMessageComponentCollector({
			time: this.options.time || 60_000,
			componentType: 'BUTTON'
		});

		collector.on('collect', async (i) => {
			row.components.forEach((b) => b.setDisabled());
			if (id !== i.user.id) {
				await i.reply({
					content: this.options.wrongUserResponse ?? 'Not for you!',
					ephemeral: true
				});
				return;
			}
			await msg.edit({ components: [row] });
			if (i.customId === this.buttons[0].customId) {
				this.options.onConfirm({ i, msg });
			} else if (i.customId === this.buttons[1].customId) {
				this.options.onCancel({ i, msg });
			}
		});

		collector.on('end', async (c) => {
			if (this.options.onEnd) {
				return this.options.onEnd({ collection: c, msg });
			}
			if (c.filter((b) => b.user.id === id)?.size === 0) {
				row.components.forEach((b) => b.setDisabled());
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
	embed?: Embed;
	content?: string;
	buttonLabels?: string[];
	emojis?: string[];
	time?: number;
	color?: ColorResolvable;
	wrongUserResponse?: string;

	onConfirm: (payload: payload) => void;
	onCancel: (payload: payload) => void;
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
	emoji?: EmojiIdentifierResolvable;
	style: 'SUCCESS' | 'DANGER' | 'PRIMARY' | 'SECONDARY';
}