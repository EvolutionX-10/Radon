import { describe, expect, it, mock } from 'bun:test';
import { ComponentType, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { UserCommand as UpdatesCommand } from '../src/commands/General/updates.js';
import { findUpdate, updateChoices, updates } from '../src/lib/updates/catalogue.js';
import { updateCard, updatesUrl } from '../src/lib/updates/presentation.js';
import { displayText } from './fixtures/presentation.js';

describe('shared player update history', () => {
	it('keeps stable, unique releases newest first and every card within Discord limits', () => {
		expect(updates.length).toBeGreaterThan(0);
		expect(new Set(updates.map((entry) => entry.id)).size).toBe(updates.length);
		for (const [index, entry] of updates.entries()) {
			expect(entry.id).toMatch(/^[a-z0-9-]{1,80}$/);
			expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(entry.date);
			if (index) expect(updates[index - 1].date >= entry.date).toBe(true);
			expect(entry.title.length).toBeGreaterThan(0);
			expect(entry.title.length).toBeLessThanOrEqual(80);
			expect(entry.summary.length).toBeGreaterThan(0);
			expect(entry.summary.length).toBeLessThanOrEqual(300);
			expect(entry.changes.length).toBeGreaterThan(0);
			expect(entry.changes.every((change) => change.trim().length > 0)).toBe(true);
			const panel = updateCard(entry).toJSON();
			const text = displayText({ components: [panel] });
			expect(text.length).toBeLessThanOrEqual(3500);
			expect(panel.components.length).toBeLessThan(40);
			const row = panel.components.find((component) => component.type === ComponentType.ActionRow);
			expect(row?.components[0]).toMatchObject({ label: 'All updates', url: updatesUrl });
		}
	});
	it('defaults to latest and never substitutes another release for an unknown ID', () => {
		expect(findUpdate()).toEqual(updates[0]);
		expect(findUpdate(null)).toEqual(updates[0]);
		expect(findUpdate(updates.at(-1)!.id)).toEqual(updates.at(-1));
		expect(findUpdate('unknown')).toBeUndefined();
	});
	it('searches history without case sensitivity and respects Discord suggestion bounds', () => {
		expect(updateChoices(' BUG ')).toContainEqual(expect.objectContaining({ value: 'bug-reports-and-updates' }));
		expect(updateChoices('2026-10-31')).toHaveLength(updates.length);
		expect(updateChoices('nonexistent')).toEqual([]);
		const history = Array.from({ length: 35 }, (_, index) => ({ ...updates[0], id: `release-${index}`, title: 'Long title '.repeat(30) }));
		const choices = updateChoices('', history);
		expect(choices).toHaveLength(25);
		expect(choices.every((choice) => choice.name.length <= 100 && choice.value.length <= 100)).toBe(true);
		expect(choices[0].value).toBe('release-0');
	});
});

describe('/updates', () => {
	it('registers an optional searchable release while keeping /updates alone usable', () => {
		let command: any;
		UpdatesCommand.prototype.registerApplicationCommands.call(
			{ name: 'updates', description: 'Read recent changes' } as any,
			{ registerChatInputCommand: (build: any) => (command = build(new SlashCommandBuilder()).toJSON()) } as any
		);
		expect(command.contexts).toEqual([InteractionContextType.Guild]);
		expect(command.options).toHaveLength(1);
		expect(command.options[0]).toMatchObject({ name: 'release', autocomplete: true });
		expect(command.options[0].required ?? false).toBe(false);
	});
	it('returns the latest and selected release privately, with mentions disabled', async () => {
		for (const release of [null, updates.at(-1)!.id]) {
			const reply = mock(async (_payload: any) => {});
			await UpdatesCommand.prototype.chatInputRun.call({} as any, { options: { getString: () => release }, reply } as any);
			const payload = reply.mock.calls[0][0];
			expect(payload.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
			expect(payload.flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
			expect(payload.allowedMentions).toEqual({ parse: [] });
			expect(displayText(payload)).toContain(findUpdate(release)!.title);
		}
	});
	it('handles a stale or forged selection privately without echoing user input', async () => {
		const reply = mock(async (_payload: any) => {});
		await UpdatesCommand.prototype.chatInputRun.call({} as any, { options: { getString: () => '@everyone unknown' }, reply } as any);
		const payload = reply.mock.calls[0][0];
		expect(payload.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
		expect(displayText(payload)).toContain('unavailable');
		expect(displayText(payload)).not.toContain('@everyone');
	});
	it('responds to autocomplete with matching stable release IDs', async () => {
		const respond = mock(async (_choices: any) => {});
		await UpdatesCommand.prototype.autocompleteRun.call({} as any, { options: { getFocused: () => 'games' }, respond } as any);
		expect(respond.mock.calls[0][0]).toEqual(updateChoices('games'));
	});
});
