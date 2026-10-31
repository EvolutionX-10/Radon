import { describe, expect, it } from 'bun:test';
import { ComponentType } from 'discord.js';
import { buildHelpContainer, getHelpCategories, getHelpPage, type HelpEntry } from '../src/lib/structures/help/layout.js';

const entries: HelpEntry[] = Array.from({ length: 9 }, (_, index) => ({
	name: `/command${index}`,
	description: `Description ${index}`,
	category: index < 5 ? 'General' : 'Moderation',
	usage: `/command${index} <user> [reason]`
}));

describe('help pages', () => {
	it('deduplicates and sorts categories, and filters before paginating', () => {
		expect(getHelpCategories(entries)).toEqual(['General', 'Moderation']);
		const page = getHelpPage(entries, { category: 'General', page: 1 });
		expect(page.total).toBe(5);
		expect(page.pages).toBe(2);
		expect(page.entries.map((entry) => entry.name)).toEqual(['/command4']);
	});

	it('clamps navigation to the first and last pages', () => {
		expect(getHelpPage(entries, { category: 'all', page: -1 }).page).toBe(0);
		const last = getHelpPage(entries, { category: 'all', page: 999 });
		expect(last.page).toBe(2);
		expect(last.entries.map((entry) => entry.name)).toEqual(['/command8']);
		expect(getHelpPage(entries, { category: 'all', page: Number.NaN }).page).toBe(0);
	});

	it('represents empty results as one usable page', () => {
		expect(getHelpPage([], { category: 'all', page: 10 })).toEqual({ entries: [], total: 0, page: 0, pages: 1 });
		expect(getHelpPage(entries, { category: 'missing', page: 0 }).total).toBe(0);
	});
});

describe('Components V2 help layout', () => {
	it('serializes a native container with category selection and boundary-aware navigation', () => {
		const payload = buildHelpContainer(entries, { category: 'all', page: 0 }).toJSON();
		expect(payload.type).toBe(ComponentType.Container);
		const rows = payload.components.filter((component) => component.type === ComponentType.ActionRow);
		const [select] = rows[0].components;
		expect(select.type).toBe(ComponentType.StringSelect);
		if (select.type !== ComponentType.StringSelect) throw new Error('Expected category menu');
		expect(select.custom_id).toBe('help:category');
		expect(select.options.map((option) => option.value)).toEqual(['all', 'General', 'Moderation']);
		const buttons = rows[1].components;
		expect(buttons.map((button) => button.disabled)).toEqual([true, true, true, false, false]);
		const last = buildHelpContainer(entries, { category: 'all', page: 2 }).toJSON();
		const lastRow = last.components.filter((component) => component.type === ComponentType.ActionRow)[1];
		expect(lastRow.components.map((button) => button.disabled)).toEqual([false, false, true, true, true]);
	});

	it('disables every control when the session expires and preserves its content', () => {
		const payload = buildHelpContainer(entries, { category: 'Moderation', page: 0 }, true).toJSON();
		for (const row of payload.components.filter((component) => component.type === ComponentType.ActionRow)) {
			expect(row.components.every((component) => component.disabled)).toBe(true);
		}
		const text = payload.components.filter((component) => component.type === ComponentType.TextDisplay).map((component) => component.content);
		expect(text.join('\n')).toContain('session has expired');
		expect(text.join('\n')).toContain('/command5');
		expect(text.join('\n')).not.toContain('/command0');
	});

	it('shows a useful empty state with disabled controls', () => {
		const payload = buildHelpContainer([], { category: 'all', page: 0 }).toJSON();
		expect(JSON.stringify(payload)).toContain('No commands are available');
		expect(JSON.stringify(payload)).toContain('Page 1 / 1');
		for (const row of payload.components.filter((component) => component.type === ComponentType.ActionRow)) {
			expect(row.components.every((component) => component.disabled)).toBe(true);
		}
	});

	it('bounds long command text and the dropdown to Discord limits', () => {
		const longEntries = Array.from({ length: 30 }, (_, index) => ({
			name: 'x'.repeat(1000),
			description: 'x'.repeat(10000),
			usage: 'x'.repeat(10000),
			details: 'x'.repeat(10000),
			category: `Category ${index}`
		}));
		const payload = buildHelpContainer(longEntries, { category: 'all', page: 0 }).toJSON();
		const text = payload.components.filter((component) => component.type === ComponentType.TextDisplay).map((component) => component.content);
		expect(text.join('').length).toBeLessThanOrEqual(4000);
		const menu = payload.components.filter((component) => component.type === ComponentType.ActionRow)[0].components[0];
		if (menu.type !== ComponentType.StringSelect) throw new Error('Expected category menu');
		expect(menu.options).toHaveLength(25);
	});
});
