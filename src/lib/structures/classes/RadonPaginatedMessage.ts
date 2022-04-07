import { PaginatedMessage, PaginatedMessageOptions } from '@sapphire/discord.js-utilities';
/**
 * Extends Paginated message with custom order and no select menus
 * as well as unlimited pages
 */
export class RadonPaginatedMessage extends PaginatedMessage {
	public constructor(options: PaginatedMessageOptions = {}) {
		super(options);
		const elem = [...PaginatedMessage.defaultActions];
		const neworder = [elem[0], elem[1], elem[2], elem[5], elem[3], elem[4]];
		this.setActions([...neworder]);
	}
}
