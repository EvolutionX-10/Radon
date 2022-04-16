import { EmojiIdentifierResolvable, MessageButton, MessageButtonStyleResolvable } from 'discord.js';

export class Button extends MessageButton {
	/**
	 * Custom ID
	 * @param id The id of the button
	 * @returns Button
	 */
	public _customId(id: string) {
		return this.setCustomId(id);
	}

	/**
	 * Label
	 * @param label The label of the button
	 * @returns Button
	 */
	public _label(label: string) {
		return this.setLabel(label);
	}

	/**
	 * Style
	 * @param type The type of button
	 * @returns Button
	 */
	public _style(type: MessageButtonStyleResolvable) {
		return this.setStyle(type);
	}

	/**
	 * URL
	 * @param url The url of the button
	 * @returns Button
	 */
	public _url(url: string) {
		return this.setURL(url);
	}

	/**
	 * Disabled
	 * @param disabled The disabled state of the button
	 * @returns Button
	 */
	public _disabled(disabled?: boolean) {
		return this.setDisabled(disabled);
	}

	/**
	 * Emoji
	 * @param emoji The emoji of the button
	 * @returns Button
	 */
	public _emoji(emoji: EmojiIdentifierResolvable) {
		return this.setEmoji(emoji);
	}
}
