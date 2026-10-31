import { PaginatedMessage, type PaginatedMessageResolvedPage } from '@sapphire/discord.js-utilities';
import { ComponentType, Message, type APIActionRowComponent, type APIComponentInMessageActionRow } from 'discord.js';
import { v2 } from './components.js';

export function componentPage(handler: PaginatedMessage, page: PaginatedMessageResolvedPage, index: number) {
	const converted = v2(page, 'Radon');
	handler.messages[index] = converted;
	return converted;
}

/** Keep the current card visible when the existing pagination session ends. */
export async function endComponentPagination(handler: PaginatedMessage, reason: string) {
	handler.collector?.removeAllListeners();
	if (!handler.response || PaginatedMessage.deletionStopReasons.includes(reason)) return;
	const page = handler.messages[handler.index];
	if (!page) return;
	const components = page.components?.filter((component) => {
		const data = 'toJSON' in component ? component.toJSON() : component;
		return data.type !== ComponentType.ActionRow;
	});
	if (handler.response instanceof Message) await handler.response.edit({ components });
	else if (handler.response.isMessageComponent() && !handler.response.replied && !handler.response.deferred)
		await handler.response.update({ components });
	else await handler.response.editReply({ components });
}

export function updatePageMenu(handler: PaginatedMessage) {
	const page = handler.messages[handler.index];
	if (!page) return;
	page.components = page.components?.map((component) => {
		const data = 'toJSON' in component ? component.toJSON() : component;
		if (data.type !== ComponentType.ActionRow) return component;
		const row = data as APIActionRowComponent<APIComponentInMessageActionRow>;
		return {
			...row,
			components: row.components.map((control) =>
				control.type === ComponentType.StringSelect
					? { ...control, options: control.options.map((option) => ({ ...option, default: option.value === String(handler.index) })) }
					: control
			)
		};
	});
}
