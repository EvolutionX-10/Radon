import { ButtonBuilder, ButtonStyle, ContainerBuilder, StringSelectMenuBuilder } from 'discord.js';

export interface HelpEntry {
	name: string;
	description: string;
	category: string;
	usage: string;
	details?: string;
}

export interface HelpState {
	category: string;
	/** Zero-based page index. */
	page: number;
}

const PageSize = 4;

export function getHelpCategories(entries: readonly HelpEntry[]): string[] {
	return [...new Set(entries.map((entry) => entry.category))].sort((a, b) => a.localeCompare(b));
}

export function getHelpPage(entries: readonly HelpEntry[], state: HelpState) {
	const filtered = state.category === 'all' ? entries : entries.filter((entry) => entry.category === state.category);
	const pages = Math.max(1, Math.ceil(filtered.length / PageSize));
	const page = Math.max(0, Math.min(pages - 1, Number.isFinite(state.page) ? Math.floor(state.page) : 0));
	return { entries: filtered.slice(page * PageSize, (page + 1) * PageSize), page, pages, total: filtered.length };
}

/** Keep four command cards plus navigation comfortably within the message text limit. */
function truncate(value: string, limit: number) {
	return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

function commandText(entry: HelpEntry) {
	const name = truncate(entry.name, 100);
	const description = truncate(entry.description || 'No description provided.', 180);
	const usage = truncate(entry.usage.replaceAll('`', 'ˋ'), 320);
	const details = entry.details ? `\n${truncate(entry.details, 150)}` : '';
	return `### ${name}\n${description}\n**Usage:** \`${usage}\`${details}`;
}

export function buildHelpContainer(entries: readonly HelpEntry[], state: HelpState, expired = false): ContainerBuilder {
	const current = getHelpPage(entries, state);
	const categories = getHelpCategories(entries);
	const category = state.category === 'all' ? 'All categories' : truncate(state.category, 100);
	const container = new ContainerBuilder()
		.setAccentColor(0x5865f2)
		.addTextDisplayComponents((text) =>
			text.setContent(
				`## Radon Help\nAvailable to you in this channel\n**${category}** · ${current.total} command${current.total === 1 ? '' : 's'} · Page ${current.page + 1} / ${current.pages}`
			)
		)
		.addSeparatorComponents((separator) => separator);

	if (current.entries.length) {
		for (const entry of current.entries) container.addTextDisplayComponents((text) => text.setContent(commandText(entry)));
	} else {
		container.addTextDisplayComponents((text) => text.setContent('No commands are available to you in this category and channel.'));
	}

	container
		.addSeparatorComponents((separator) => separator)
		.addTextDisplayComponents((text) =>
			text.setContent(
				'-# `<argument>` is required; `[argument]` is optional. Context commands: right-click a user or message → Apps.\n' +
					(expired ? '-# This help session has expired. Run `/help` to start again.' : '-# Choose a category or use the arrows to explore.')
			)
		);

	const menu = new StringSelectMenuBuilder()
		.setCustomId('help:category')
		.setPlaceholder('Browse command categories')
		.setDisabled(expired || categories.length === 0)
		.addOptions({ label: 'All categories', value: 'all', default: state.category === 'all' });
	for (const name of categories.slice(0, 24)) {
		menu.addOptions({ label: truncate(name, 100), value: name.slice(0, 100), default: state.category === name });
	}
	container.addActionRowComponents((row) => row.addComponents(menu));

	const button = (id: string, label: string, disabled: boolean) =>
		new ButtonBuilder()
			.setCustomId(`help:${id}`)
			.setStyle(ButtonStyle.Secondary)
			.setLabel(label)
			.setDisabled(expired || disabled);
	container.addActionRowComponents((row) =>
		row.addComponents(
			button('first', '≪ First', current.page === 0),
			button('previous', '‹ Back', current.page === 0),
			button('page', `${current.page + 1} / ${current.pages}`, true),
			button('next', 'Next ›', current.page === current.pages - 1),
			button('last', 'Last ≫', current.page === current.pages - 1)
		)
	);
	return container;
}
