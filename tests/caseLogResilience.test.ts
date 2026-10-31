import { describe, expect, it } from 'bun:test';
import { UserListener } from '../src/listeners/Moderation/modLogs.js';

function fixture(failCreate: boolean, failAttach: boolean) {
	const data = { action: 'ban', reason: 'spam', moderator: { id: 'mod', guild: { id: 'guild' } }, target: { id: 'user' } };
	const sent = { id: 'log' };
	const errors: unknown[][] = [];
	const logs: unknown[][] = [];
	let attachments = 0;
	const listener = {
		container: {
			logger: { error: (...args: unknown[]) => errors.push(args) },
			prisma: {
				moderationCase: {
					create: async () => {
						if (failCreate) throw new Error('Database unavailable');
						return { id: 'case' };
					},
					update: async () => {
						attachments++;
						if (failAttach) throw new Error('Database unavailable');
					}
				}
			}
		},
		sendModLog: async (...args: unknown[]) => {
			logs.push(args);
			return sent;
		}
	};
	return { data, sent, listener, errors, logs, attachments: () => attachments };
}

describe('case persistence and Discord log resilience', () => {
	it('still sends the successful action log when its case cannot be stored', async () => {
		const f = fixture(true, false);
		expect(await UserListener.prototype.run.call(f.listener as any, f.data as any)).toBe(f.sent);
		expect(f.logs).toEqual([[f.data, undefined]]);
		expect(f.attachments()).toBe(0);
		expect(f.errors).toHaveLength(1);
	});
	it('retains a sent log when associating it with the case fails', async () => {
		const f = fixture(false, true);
		expect(await UserListener.prototype.run.call(f.listener as any, f.data as any)).toBe(f.sent);
		expect(f.logs).toEqual([[f.data, 'case']]);
		expect(f.attachments()).toBe(1);
		expect(f.errors).toHaveLength(1);
	});
});
