// create a class Select that extends MessageSelectMenu

import { SelectMenuComponentOptionData, BaseSelectMenuBuilder, APISelectMenuComponent } from 'discord.js';

export class Select<T extends APISelectMenuComponent> extends BaseSelectMenuBuilder<T> {
	/**
	 * Custom ID
	 * @param id The id of the select
	 * @returns Select
	 */
	public _customId(id: string) {
		return this.setCustomId(id);
	}

	/**
	 * Label
	 * @param label The label of the select aka Placeholder
	 * @returns Select
	 */
	public _label(label: string) {
		return this.setPlaceholder(label);
	}

	/**
	 * Disabled
	 * @param disabled The disabled state of the select
	 * @default true
	 * @returns Select
	 */
	public _disabled(disabled?: boolean) {
		return this.setDisabled(disabled);
	}

	/**
	 * Min
	 * @param min Minimum amount of values to select
	 * @returns Select
	 */
	public _min(min: number) {
		return this.setMinValues(min);
	}

	/**
	 * Max
	 * @param max Maximum amount of values to select
	 * @returns Select
	 */
	public _max(max: number) {
		return this.setMaxValues(max);
	}

	/**
	 * Options
	 * @param options The options to add to the select
	 * @returns Select
	 */
	public _options(...options: SelectMenuComponentOptionData[]) {
		return this;
	}
}
