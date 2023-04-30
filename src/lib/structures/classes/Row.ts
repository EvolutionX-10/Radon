import { ActionRowBuilder, type AnyComponentBuilder, type RestOrArray } from 'discord.js';

export class Row<T extends AnyComponentBuilder> extends ActionRowBuilder<T> {
	/**
	 * Components
	 * @param components The components to add to the row
	 * @returns Row
	 */
	public _components(...components: RestOrArray<T>) {
		return this.setComponents(...components);
	}
}
