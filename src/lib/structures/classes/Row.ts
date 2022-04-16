import { MessageActionRow, MessageActionRowComponentResolvable } from 'discord.js';

export class Row extends MessageActionRow {
	/**
	 * Components
	 * @param components The components to add to the row
	 * @returns Row
	 */
	public _components(...components: MessageActionRowComponentResolvable[] | MessageActionRowComponentResolvable[][]) {
		return this.setComponents(...components);
	}
}
