import { describe, expect, it } from 'bun:test';
import { checkedMongoResult } from '../src/lib/automod/lease.js';

describe('AutoMod raw write acknowledgments', () => {
	it('rejects command errors, write errors, and unacknowledged write concerns', () => {
		for (const result of [{ ok: 0 }, { ok: 1, writeErrors: [{ code: 11000 }] }, { ok: 1, writeConcernError: { code: 64 } }])
			expect(() => checkedMongoResult(result)).toThrow();
	});
	it('requires a matched live token for lease completion and renewal', () => {
		expect(() => checkedMongoResult({ ok: 1, n: 0 }, true)).toThrow('ownership');
		expect(checkedMongoResult({ ok: 1, n: 1 }, true)).toEqual({ ok: 1, n: 1 });
	});
});
