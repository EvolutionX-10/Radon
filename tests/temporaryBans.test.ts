import { describe, expect, it } from 'bun:test';
import type { PrismaClient, moderationScheduledBan } from '@prisma/client';
import type { Client } from 'discord.js';
import {
	TemporaryBans,
	banTaskId,
	temporaryBanReason,
	guardScheduledBanReplacement,
	banDispatchReason,
	finishBanDispatch,
	recoverBanDispatch,
	assertBanDispatchWindow
} from '../src/lib/moderation/temporaryBans.js';

const now = new Date('2026-10-31T12:00:00Z');
const task = {
	id: 'g:u',
	generation: 'generation',
	guildId: 'g',
	targetId: 'u',
	expectedReason: 'expected',
	dueAt: now,
	nextAttemptAt: now,
	status: 'scheduled'
} as moderationScheduledBan;
function fixture(reason: string | null, claim = true, renew = true) {
	let removed = 0;
	const commands: any[] = [];
	const prisma = {
		$runCommandRaw: async (q: any) => {
			commands.push(q);
			return { ok: 1, value: (commands.length === 1 ? claim : renew) ? { _id: task.id } : null };
		},
		moderationScheduledBan: { findFirst: async () => task }
	} as unknown as PrismaClient;
	const guild = {
		members: { me: null },
		bans: {
			cache: new Map(),
			fetch: async () => {
				if (reason === null) throw { code: 10026 };
				return { reason, user: { id: 'u' } };
			},
			remove: async () => {
				removed++;
			}
		}
	};
	const client = {
		rest: {
			delete: async (_route: string, options: any) => {
				expect(options.signal).toBeInstanceOf(AbortSignal);
				removed++;
			}
		},
		guilds: { cache: new Map([['g', guild]]), fetch: async () => guild }
	} as unknown as Client;
	return {
		service: new TemporaryBans(
			prisma,
			client,
			() => undefined,
			() => now
		),
		commands,
		removed: () => removed
	};
}

describe('temporary ban safety', () => {
	it('uses deterministic active-task keys and a distinct marker for each ban generation', () => {
		expect(banTaskId('g', 'u')).toBe('g:u');
		expect(temporaryBanReason('x'.repeat(600), 'generation').length).toBeLessThanOrEqual(512);
		expect(temporaryBanReason('spam', 'a')).not.toBe(temporaryBanReason('spam', 'b'));
	});
	it('does not act without an exclusive persisted lease', async () => {
		const f = fixture('expected', false);
		await f.service.process(task, now);
		expect(f.removed()).toBe(0);
		expect(f.commands).toHaveLength(1);
	});
	it('leaves a later permanent ban intact', async () => {
		const f = fixture('replacement ban');
		await f.service.process(task, now);
		expect(f.removed()).toBe(0);
		expect(f.commands[1].update.$set.status).toBe('superseded');
	});
	it('keeps an interrupted preparation recoverable without banning or unbanning anyone', async () => {
		const f = fixture(null);
		await f.service.process({ ...task, status: 'preparing' }, now);
		expect(f.removed()).toBe(0);
		expect(f.commands[1].update.$set.nextAttemptAt).toEqual({ $date: new Date(now.getTime() + 300_000).toISOString() });
	});
	it('does not unban after a slow read outlives its lease', async () => {
		const f = fixture('expected', true, false);
		await f.service.process(task, now);
		expect(f.removed()).toBe(0);
		expect(f.commands[1].query.leaseUntil).toEqual({ $gt: { $date: now.toISOString() } });
	});
	it('does not remove a ban after the worker has stopped', async () => {
		const f = fixture('expected');
		f.service.stop();
		await f.service.process(task, now);
		expect(f.removed()).toBe(0);
	});
});

describe('ban dispatch reservations', () => {
	function storage(state: typeof task | null = { ...task, status: 'preparing' }, reserve = true) {
		const commands: any[] = [];
		const prisma = {
			moderationScheduledBan: { findUnique: async () => state },
			$runCommandRaw: async (q: any) => {
				commands.push(q);
				return { ok: 1, value: reserve ? { _id: task.id } : null };
			}
		} as unknown as PrismaClient;
		return { prisma, commands };
	}
	it('requires an existing matching preparation for every explicit generation', async () => {
		for (const state of [
			null,
			{ ...task, status: 'cancelled' },
			{ ...task, status: 'scheduled' },
			{ ...task, status: 'preparing', generation: 'newer' }
		]) {
			const f = storage(state);
			await expect(guardScheduledBanReplacement(f.prisma, 'g', 'u', task.expectedReason, task.generation, now)).rejects.toThrow(
				'cancelled or replaced'
			);
			expect(f.commands).toHaveLength(0);
		}
	});
	it('atomically reserves the exact initial preparation before dispatch', async () => {
		const f = storage();
		const lease = await guardScheduledBanReplacement(f.prisma, 'g', 'u', task.expectedReason, task.generation, now);
		expect(lease?.kind).toBe('initial');
		expect(f.commands[0].query).toMatchObject({ _id: task.id, generation: task.generation, status: 'preparing', expectedReason: 'expected' });
		expect(f.commands[0].update.$set.status).toBeUndefined();
		expect(f.commands[0].update.$set.leaseOwner).toBe(lease!.owner);
	});
	it('blocks dispatch when cancellation or another worker wins the compare-and-swap', async () => {
		const f = storage(undefined, false);
		await expect(guardScheduledBanReplacement(f.prisma, 'g', 'u', task.expectedReason, task.generation, now)).rejects.toThrow(
			'changed concurrently'
		);
	});
	it('retains a replacement schedule until the new ban has succeeded', async () => {
		const f = storage({ ...task, status: 'scheduled' });
		const lease = (await guardScheduledBanReplacement(f.prisma, 'g', 'u', task.expectedReason, undefined, now))!;
		expect(f.commands[0].update.$set.status).toBeUndefined();
		expect(banDispatchReason(lease, task.expectedReason)).not.toBe(task.expectedReason);
		await finishBanDispatch(f.prisma, lease, now);
		expect(f.commands[1].query).toMatchObject({ generation: task.generation, leaseOwner: lease.owner });
		expect(f.commands[1].update.$set.status).toBe('cancelled');
	});
	it('preserves the prior schedule on definite failure and retains uncertain dispatch leases', async () => {
		const f = storage({ ...task, status: 'scheduled' });
		const lease = (await guardScheduledBanReplacement(f.prisma, 'g', 'u', 'new', undefined, now))!;
		await recoverBanDispatch(f.prisma, lease, new Error('403'), true, now);
		expect(f.commands[1].update.$set.status).toBeUndefined();
		expect(f.commands[1].update.$set.leaseOwner).toBeNull();
		await recoverBanDispatch(f.prisma, lease, new Error('network'), false, now);
		expect(f.commands[2].update.$set.status).toBeUndefined();
		expect(f.commands[2].update.$set.leaseOwner).toBeUndefined();
	});
	it('refuses a request whose reservation response used up its dispatch budget', async () => {
		const f = storage();
		const lease = (await guardScheduledBanReplacement(f.prisma, 'g', 'u', task.expectedReason, task.generation, now))!;
		expect(() => assertBanDispatchWindow(lease, new Date(now.getTime() + 9 * 60_000))).toThrow('expired');
	});
});

describe('worker clock and deadline checks', () => {
	it('captures a fresh claim time for each task after an earlier operation takes time', async () => {
		let current = now;
		const seen: Date[] = [];
		const prisma = { moderationScheduledBan: { findMany: async () => [task, task] } } as unknown as PrismaClient;
		const client = { guilds: { cache: new Map([['g', {}]]) } } as unknown as Client;
		const worker = new TemporaryBans(
			prisma,
			client,
			() => undefined,
			() => current
		);
		worker.process = async (_task, claimTime = current) => {
			seen.push(claimTime);
			current = new Date(current.getTime() + 12 * 60_000);
		};
		await worker.tick();
		expect(seen.map((date) => date.getTime())).toEqual([now.getTime(), now.getTime() + 12 * 60_000]);
	});
	it('does not dispatch DELETE when the renewal acknowledgement arrives after its budget', async () => {
		let current = now;
		let calls = 0;
		let removed = 0;
		const prisma = {
			$runCommandRaw: async () => {
				if (++calls === 2) current = new Date(now.getTime() + 10 * 60_000);
				return { ok: 1, value: { _id: task.id } };
			}
		} as unknown as PrismaClient;
		const guild = { bans: { fetch: async () => ({ reason: task.expectedReason }) } };
		const client = {
			guilds: { fetch: async () => guild },
			rest: {
				delete: async () => {
					removed++;
				}
			}
		} as unknown as Client;
		const worker = new TemporaryBans(
			prisma,
			client,
			() => undefined,
			() => current
		);
		await worker.process(task, now);
		expect(removed).toBe(0);
	});
	it('bases retries and their token/deadline conditions on the actual failure time', async () => {
		let current = now;
		const writes: any[] = [];
		const prisma = {
			$runCommandRaw: async (q: any) => {
				writes.push(q);
				return { ok: 1, value: { _id: task.id } };
			}
		} as unknown as PrismaClient;
		const guild = {
			bans: {
				fetch: async () => {
					current = new Date(now.getTime() + 2 * 60_000);
					throw new Error('temporary network error');
				}
			}
		};
		const client = { guilds: { fetch: async () => guild } } as unknown as Client;
		const worker = new TemporaryBans(
			prisma,
			client,
			() => undefined,
			() => current
		);
		await expect(worker.process(task, now)).rejects.toThrow('network error');
		expect(writes[1].update.$set.nextAttemptAt).toEqual({ $date: new Date(now.getTime() + 7 * 60_000).toISOString() });
		expect(writes[1].query.leaseOwner).toBe(writes[0].update.$set.leaseOwner);
		expect(writes[1].query.leaseUntil).toEqual({ $gt: { $date: current.toISOString() } });
	});
});
