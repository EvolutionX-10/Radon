import { describe, expect, it } from 'bun:test';
import { LockService, runLockBatch, type LockRecord, type LockStore, type LockTarget } from '../src/lib/locks/LockService.js';
import { LockSessions } from '../src/lib/locks/sessions.js';
import { captureOverwrite, restoreRoleBits, TEXT_FLAGS } from '../src/lib/locks/targets.js';
import { PermissionsBitField } from 'discord.js';

class MemoryStore implements LockStore {
	public records = new Map<string, LockRecord>();
	async find(id: string) {
		return this.records.get(id) ?? null;
	}
	async create(record: LockRecord) {
		if (this.records.has(record.id)) throw new Error('duplicate');
		this.records.set(record.id, { ...record });
	}
	async claim(id: string, previousToken: string, token: string, now: Date, until: Date) {
		const record = this.records.get(id);
		if (!record || record.operationToken !== previousToken || (record.leaseUntil && record.leaseUntil >= now)) return false;
		record.operationToken = token;
		record.leaseUntil = until;
		return true;
	}
	async renew(id: string, token: string, until: Date) {
		const record = this.records.get(id);
		if (record?.operationToken !== token) return false;
		record.leaseUntil = until;
		return true;
	}
	async release(id: string, token: string) {
		const record = this.records.get(id);
		if (record?.operationToken === token) record.leaseUntil = null;
	}
	async remove(id: string, token: string) {
		if (this.records.get(id)?.operationToken === token) this.records.delete(id);
	}
}
function fixture() {
	const store = new MemoryStore();
	let state = 'original';
	let changes = 0;
	let restores = 0;
	const target: LockTarget = {
		id: 'guild:channel:channel:role',
		guildId: 'guild',
		targetId: 'channel',
		roleId: 'role',
		kind: 'channel',
		capture: async () => state,
		apply: async () => {
			expect(store.records.size).toBe(1);
			changes++;
			state = 'locked';
		},
		restore: async (snapshot) => {
			restores++;
			state = snapshot;
		}
	};
	return { store, target, service: new LockService(store), state: () => state, changes: () => changes, restores: () => restores };
}

describe('durable permission restoration', () => {
	it('saves before applying and restores the original state after a new service instance', async () => {
		const f = fixture();
		expect(await f.service.lock(f.target, 'reason')).toBe('locked');
		expect(f.state()).toBe('locked');
		expect(await new LockService(f.store).unlock(f.target, 'different reason')).toBe('restored');
		expect(f.state()).toBe('original');
		expect(f.store.records.size).toBe(0);
	});
	it('concurrent locks never overwrite the first snapshot or apply twice', async () => {
		const f = fixture();
		const results = await Promise.all([f.service.lock(f.target, 'first'), f.service.lock(f.target, 'second')]);
		expect(results.sort()).toEqual(['already locked', 'locked']);
		expect(f.changes()).toBe(1);
		await f.service.unlock(f.target, 'restore');
		expect(f.state()).toBe('original');
	});
	it('concurrent unlocks cannot restore the same record twice', async () => {
		const f = fixture();
		await f.service.lock(f.target, 'reason');
		const results = await Promise.all([f.service.unlock(f.target, 'a'), f.service.unlock(f.target, 'b')]);
		expect(results.sort()).toEqual(['busy', 'restored']);
		expect(f.restores()).toBe(1);
	});
	it('keeps the snapshot when a request fails after a possible side effect', async () => {
		const f = fixture();
		const apply = f.target.apply;
		f.target.apply = async (reason) => {
			await apply(reason);
			throw new Error('response lost');
		};
		await expect(f.service.lock(f.target, 'reason')).rejects.toThrow('response lost');
		expect(f.store.records.size).toBe(1);
		expect([...f.store.records.values()][0].leaseUntil).toBeNull();
		await f.service.unlock(f.target, 'recover');
		expect(f.state()).toBe('original');
	});
	it('retains the snapshot after failed restoration and permits a retry', async () => {
		const f = fixture();
		await f.service.lock(f.target, 'reason');
		const restore = f.target.restore;
		f.target.restore = async () => {
			throw new Error('missing permission');
		};
		await expect(f.service.unlock(f.target, 'reason')).rejects.toThrow('missing permission');
		expect(f.store.records.size).toBe(1);
		f.target.restore = restore;
		expect(await f.service.unlock(f.target, 'retry')).toBe('restored');
	});
	it('never guesses permission values for a legacy lock without a snapshot', async () => {
		const f = fixture();
		expect(await f.service.unlock(f.target, 'reason')).toBe('no snapshot');
		expect(f.restores()).toBe(0);
	});
	it('does not restore while the initial mutation holds an active lease', async () => {
		const f = fixture();
		let finish!: () => void;
		const pending = new Promise<void>((resolve) => {
			finish = resolve;
		});
		f.target.apply = async () => {
			await pending;
		};
		const locking = f.service.lock(f.target, 'lock');
		while (!f.store.records.size) await Promise.resolve();
		expect(await f.service.unlock(f.target, 'unlock')).toBe('busy');
		finish();
		await locking;
	});
	it('restores a lock abandoned by a terminated worker after its lease expires', async () => {
		const f = fixture();
		await f.service.lock(f.target, 'lock');
		const record = [...f.store.records.values()][0];
		record.leaseUntil = new Date(0);
		expect(await new LockService(f.store).unlock(f.target, 'recover')).toBe('restored');
	});
	it('captures allow, deny and inherited states without changing unrelated flags', () => {
		const bits = PermissionsBitField.Flags;
		const snapshot = captureOverwrite(bits.SendMessages | bits.ManageMessages, bits.AddReactions, TEXT_FLAGS);
		expect(snapshot.SendMessages).toBe(true);
		expect(snapshot.AddReactions).toBe(false);
		expect(snapshot.CreatePublicThreads).toBeNull();
		expect('ManageMessages' in snapshot).toBe(false);
		expect(restoreRoleBits(bits.ManageMessages | bits.Connect, bits.SendMessages, bits.SendMessages | bits.Connect)).toBe(
			bits.ManageMessages | bits.SendMessages
		);
	});
});

describe('bulk lock execution', () => {
	it('awaits each request, continues after failures, and reports exact totals', async () => {
		const completed: number[] = [];
		const result = await runLockBatch(
			[1, 2, 3, 4],
			async (n) => {
				await Promise.resolve();
				if (n === 2) throw new Error('Denied');
				completed.push(n);
				return n !== 3;
			},
			String
		);
		expect(completed).toEqual([1, 3, 4]);
		expect(result).toEqual({ completed: 2, skipped: 1, failures: ['2: Denied'] });
	});
	it('does not abort the batch when a progress update fails', async () => {
		const result = await runLockBatch(
			Array.from({ length: 21 }, (_, i) => i),
			async () => true,
			String,
			async () => {
				throw new Error('webhook gone');
			}
		);
		expect(result.completed).toBe(21);
		expect(result.failures).toEqual([]);
	});
});

describe('lock modal sessions', () => {
	const input = {
		userId: 'user',
		guildId: 'guild',
		action: 'lock' as const,
		scope: 'text' as const,
		roleId: 'role',
		channelId: 'channel',
		threads: false,
		deep: false
	};
	it('keeps two simultaneous prompts separate and consumes each only once', () => {
		const sessions = new LockSessions();
		const first = sessions.create(input);
		const second = sessions.create({ ...input, channelId: 'other' });
		expect(sessions.consume(first, 'user', 'guild')?.channelId).toBe('channel');
		expect(sessions.consume(second, 'user', 'guild')?.channelId).toBe('other');
		expect(sessions.consume(first, 'user', 'guild')).toBeNull();
	});
	it('requires the initiating user and server, without consuming a valid prompt on mismatch', () => {
		const sessions = new LockSessions();
		const id = sessions.create(input);
		expect(sessions.consume(id, 'other', 'guild')).toBeNull();
		expect(sessions.consume(id, 'user', 'other')).toBeNull();
		expect(sessions.consume(id, 'user', 'guild')).not.toBeNull();
	});
	it('expires prompts rather than applying stale state', () => {
		let now = 0;
		const sessions = new LockSessions(() => now);
		const id = sessions.create(input);
		now = 300_001;
		expect(sessions.consume(id, 'user', 'guild')).toBeNull();
	});
});

import type { PrismaClient } from '@prisma/client';
import { GuildChannel, ChannelType, Collection } from 'discord.js';
import { channelTarget } from '../src/lib/locks/targets.js';
import { lockStore } from '../src/lib/locks/store.js';

function fakeChannel(initial?: { allow: bigint; deny: bigint }) {
	const cache = new Collection<string, { allow: PermissionsBitField; deny: PermissionsBitField }>();
	if (initial) cache.set('role', { allow: new PermissionsBitField(initial.allow), deny: new PermissionsBitField(initial.deny) });
	const value = Object.create(GuildChannel.prototype);
	const manager = {
		cache,
		edit: async (_role: string, permissions: Record<string, boolean | null>) => {
			const current = cache.get('role') ?? { allow: new PermissionsBitField(), deny: new PermissionsBitField() };
			for (const [key, state] of Object.entries(permissions)) {
				const bit = PermissionsBitField.Flags[key as keyof typeof PermissionsBitField.Flags];
				current.allow.remove(bit);
				current.deny.remove(bit);
				if (state === true) current.allow.add(bit);
				if (state === false) current.deny.add(bit);
			}
			cache.set('role', current);
			return value;
		},
		delete: async () => {
			cache.delete('role');
			return value;
		}
	};
	Object.defineProperties(value, {
		type: { value: ChannelType.GuildText },
		permissionOverwrites: { value: manager },
		permissionsFor: { value: () => new PermissionsBitField(PermissionsBitField.Flags.ManageRoles) }
	});
	const guild = { id: 'guild', channels: { fetch: async () => value }, members: { me: {} } };
	return { cache, target: channelTarget(guild as never, 'channel', 'role', TEXT_FLAGS) };
}

describe('Discord overwrite adapter', () => {
	it('restores tri-state flags and preserves unrelated changes made during a lock', async () => {
		const bits = PermissionsBitField.Flags;
		const f = fakeChannel({ allow: bits.SendMessages, deny: bits.AddReactions });
		const original = await f.target.capture();
		await f.target.apply('lock');
		expect(f.cache.get('role')!.deny.has('SendMessages')).toBe(true);
		f.cache.get('role')!.allow.add('ManageMessages');
		await f.target.restore(original, 'restore');
		expect(f.cache.get('role')!.allow.has(['SendMessages', 'ManageMessages'])).toBe(true);
		expect(f.cache.get('role')!.deny.has('AddReactions')).toBe(true);
		expect(f.cache.get('role')!.allow.has('CreatePublicThreads')).toBe(false);
		expect(f.cache.get('role')!.deny.has('CreatePublicThreads')).toBe(false);
	});
	it('removes an introduced empty overwrite and preserves one that originally existed', async () => {
		for (const existed of [true, false]) {
			const f = fakeChannel(existed ? { allow: 0n, deny: 0n } : undefined);
			const original = await f.target.capture();
			await f.target.apply('lock');
			await f.target.restore(original, 'restore');
			expect(f.cache.has('role')).toBe(existed);
		}
	});
	it('keeps a new overwrite when unrelated permissions were added while locked', async () => {
		const f = fakeChannel();
		const original = await f.target.capture();
		await f.target.apply('lock');
		f.cache.get('role')!.allow.add('ManageMessages');
		await f.target.restore(original, 'restore');
		expect(f.cache.get('role')!.allow.has('ManageMessages')).toBe(true);
	});
});

describe('Mongo lease commands', () => {
	it('uses one atomic conditional findAndModify with extended JSON dates', async () => {
		const commands: unknown[] = [];
		const prisma = {
			$runCommandRaw: async (command: unknown) => {
				commands.push(command);
				return { ok: 1, value: { _id: 'lock' } };
			}
		} as unknown as PrismaClient;
		const now = new Date('2026-01-01T00:00:00.000Z');
		const until = new Date(now.getTime() + 120_000);
		expect(await lockStore(prisma).claim('lock', 'previous', 'new', now, until)).toBe(true);
		expect(commands).toEqual([
			{
				findAndModify: 'channelLockSnapshot',
				query: {
					_id: 'lock',
					operationToken: 'previous',
					$or: [{ leaseUntil: null }, { leaseUntil: { $lt: { $date: now.toISOString() } } }]
				},
				update: { $set: { operationToken: 'new', leaseUntil: { $date: until.toISOString() } } },
				new: true
			}
		]);
	});
	it('rejects write errors rather than treating them as a successful release', async () => {
		const prisma = { $runCommandRaw: async () => ({ ok: 1, writeErrors: [{ code: 13 }] }) } as unknown as PrismaClient;
		await expect(lockStore(prisma).release('id', 'token')).rejects.toThrow('persistence failed');
	});
	it('cannot delete a replacement snapshot when lease ownership changed', async () => {
		const commands: unknown[] = [];
		const prisma = {
			$runCommandRaw: async (command: unknown) => {
				commands.push(command);
				return { ok: 1, n: 0 };
			}
		} as unknown as PrismaClient;
		await expect(lockStore(prisma).remove('id', 'old')).rejects.toThrow('ownership changed');
		expect(commands).toEqual([{ delete: 'channelLockSnapshot', deletes: [{ q: { _id: 'id', operationToken: 'old' }, limit: 1 }] }]);
	});
});

import { LockExpiryWorker, parseLockDuration } from '../src/lib/locks/expiry.js';

describe('lease renewal during slow Discord requests', () => {
	it('keeps a slow in-flight lock leased beyond its initial deadline', async () => {
		const f = fixture();
		let now = new Date(0);
		let tick!: () => Promise<void>;
		let stopped = false;
		const service = new LockService(f.store, () => now, {
			start: (renew) => {
				tick = renew;
				return () => {
					stopped = true;
				};
			}
		});
		let finish!: () => void;
		const wait = new Promise<void>((resolve) => {
			finish = resolve;
		});
		f.target.apply = async () => {
			await wait;
		};
		const pending = service.lock(f.target, 'lock');
		while (!tick) await Promise.resolve();
		now = new Date(90_000);
		await tick();
		now = new Date(180_000);
		expect(await new LockService(f.store, () => now).unlock(f.target, 'too early')).toBe('busy');
		finish();
		expect(await pending).toBe('locked');
		expect(stopped).toBe(true);
		expect([...f.store.records.values()][0].leaseUntil).toBeNull();
	});
	it('retains recovery data and refuses success after losing lease ownership', async () => {
		const f = fixture();
		let tick!: () => Promise<void>;
		let finish!: () => void;
		const wait = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const service = new LockService(f.store, () => new Date(), {
			start: (renew) => {
				tick = renew;
				return () => {};
			}
		});
		f.target.apply = async () => {
			await wait;
		};
		const pending = service.lock(f.target, 'lock');
		while (!tick) await Promise.resolve();
		const record = [...f.store.records.values()][0];
		record.operationToken = 'replacement-owner';
		await tick();
		finish();
		await expect(pending).rejects.toThrow('ownership could not be verified');
		expect(f.store.records.get(f.target.id)?.snapshot).toBe('original');
		expect(f.store.records.get(f.target.id)?.operationToken).toBe('replacement-owner');
	});
});

describe('temporary lock expiry', () => {
	it('accepts explicit bounded durations and rejects ambiguous or unsafe values', () => {
		expect(parseLockDuration('')).toBeNull();
		expect(parseLockDuration('10m')).toBe(600_000);
		expect(parseLockDuration('1d 6h')).toBe(108_000_000);
		expect(parseLockDuration('0.5h')).toBe(1_800_000);
		for (const input of ['30', '-1h', '1month', '10m garbage', '0s', '9s', '29d']) expect(() => parseLockDuration(input)).toThrow();
	});
	it('restores persisted jobs after a worker restart and backs off failures without dropping later jobs', async () => {
		const f = fixture();
		await f.service.lock(f.target, 'lock', new Date(0));
		const record = [...f.store.records.values()][0];
		const errors: unknown[] = [];
		const delayed: Date[] = [];
		let called = 0;
		const worker = new LockExpiryWorker(
			{
				listDue: async () => [record, record],
				restore: async () => {
					called++;
					if (called === 1) throw new Error('missing permission');
					return new LockService(f.store).unlock(f.target, 'expired');
				},
				defer: async (_record, until) => {
					delayed.push(until);
				},
				error: (error) => {
					errors.push(error);
				}
			},
			() => new Date(0)
		);
		await worker.run();
		expect(called).toBe(2);
		expect(errors).toHaveLength(1);
		expect(delayed[0].getTime()).toBe(300_000);
		expect(f.state()).toBe('original');
	});
	it('serializes polling passes while an earlier restoration is still running', async () => {
		let fetches = 0;
		let finish!: () => void;
		const wait = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const worker = new LockExpiryWorker({
			listDue: async () => {
				fetches++;
				await wait;
				return [];
			},
			restore: async () => 'restored',
			defer: async () => {},
			error: () => {}
		});
		const first = worker.run();
		await worker.run();
		expect(fetches).toBe(1);
		finish();
		await first;
		await worker.run();
		expect(fetches).toBe(2);
	});
});
