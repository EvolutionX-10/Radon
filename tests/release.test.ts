import { describe, expect, it } from 'bun:test';
import { release } from '../src/lib/release.js';
import { findUpdate, updateChoices } from '../src/lib/updates/catalogue.js';
import { updateCard } from '../src/lib/updates/presentation.js';
import packageInfo from '../package.json' with { type: 'json' };
import { displayText } from './fixtures/presentation.js';

describe('V3 public release contract', () => {
	it('keeps the runtime identity, package version, and default update aligned', () => {
		expect(packageInfo.version).toBe('3.0.0');
		expect(release.version).toBe(packageInfo.version);
		expect(release.name).toBe('Radon V3');
		expect(release.stage).toBe('preview');
		expect(findUpdate()?.id).toBe(release.id);
		expect(updateChoices('V3')).toContainEqual(expect.objectContaining({ value: release.id }));
	});

	it('shows the pending launch and feature prerequisites within one Discord card', () => {
		const content = displayText({ components: [updateCard(findUpdate()!).toJSON()] });
		expect(content).toContain('3.0.0');
		expect(content).toContain('planned after Discord intent approval');
		expect(content).toContain('operator configuration');
		expect(content.length).toBeLessThanOrEqual(3500);
		expect(findUpdate('bug-reports-and-updates')?.id).toBe('bug-reports-and-updates');
	});
});
