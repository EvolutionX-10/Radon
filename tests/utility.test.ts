import { describe, expect, it } from 'bun:test';
import { clean, initClean } from '../src/lib/utility/functions/clean.js';
import { format } from '../src/lib/utility/functions/formatter.js';
import { pickRandom } from '../src/lib/utility/functions/pickRandom.js';

const zws = String.fromCharCode(8203);

describe('permission formatter', () => {
	it('formats arrays in priority order and filters to key perms by default', () => {
		const result = format(['SendMessages', 'ManageGuild', 'Administrator']);
		expect(result).toEqual(['Administrator', 'Manage Guild']);
	});

	it('formats arrays in priority order and keeps all items when key=false', () => {
		const result = format(['SendTTSMessages', 'UseVAD'], false);
		expect(result).toEqual(['Use VAD', 'Send TTS Messages']);
		expect(format('SendMessages')).toBe('Send Messages');
	});
});

describe('pickRandom', () => {
	it('returns a deterministic element when Math.random is stubbed', () => {
		const originalRandom = Math.random;
		Math.random = () => 0.5;
		const values = ['alpha', 'beta', 'gamma', 'delta'];
		expect(pickRandom(values)).toBe('gamma');
		Math.random = originalRandom;
	});

	it('throws when no array is provided', () => {
		expect(() => pickRandom(undefined as unknown as string[])).toThrow(/No array/);
	});
});

describe('clean', () => {
	it('redacts sensitive tokens and escapes mentions/markdown', () => {
		initClean(['SECRET123']);
		const sanitized = clean('SECRET123 in `code` with @mention');

		expect(sanitized).not.toContain('SECRET123');
		expect(sanitized).toContain('「ｒｅｄａｃｔｅｄ」');
		expect(sanitized).toContain(zws);
	});
});
