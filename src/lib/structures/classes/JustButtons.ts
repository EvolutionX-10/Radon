import { PaginatedMessagePage, PaginatedMessage, PaginatedMessageOptions } from '@sapphire/discord.js-utilities';
/**
 * Extends Paginated message with custom order and no select menus
 * as well as unlimited pages
 */
export class JustButtons extends PaginatedMessage {
	public constructor(options: PaginatedMessageOptions = {}) {
		super(options);
		const noSelect = [...PaginatedMessage.defaultActions.filter((obj) => obj.type === 2)];
		const neworder = [noSelect[0], noSelect[1], noSelect[4], noSelect[2], noSelect[3]];
		this.setActions(neworder);
	}

	public override addPage(page: PaginatedMessagePage): this {
		this.pages.push(page);
		return this;
	}
}
