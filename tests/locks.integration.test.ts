import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { LockService, type LockRecord, type LockTarget } from '../src/lib/locks/LockService.js';
import { lockStore } from '../src/lib/locks/store.js';

// Never inherit MONGO or connect to a production server in this test suite.
const url = process.env.RADON_LOCK_TEST_MONGO;
if (url) {
	const target = new URL(url);
	if (
		target.protocol !== 'mongodb:' ||
		!['127.0.0.1', 'localhost'].includes(target.hostname) ||
		target.username ||
		target.password ||
		!/^\/radon_test_[a-z0-9_]+$/.test(target.pathname)
	) {
		throw new Error('RADON_LOCK_TEST_MONGO must target an unauthenticated localhost radon_test_* database.');
	}
}
const suite = url ? describe : describe.skip;
suite('MongoDB lock snapshot integration', () => {
	let prisma: PrismaClient;
	beforeAll(async () => {
		prisma = new PrismaClient({ datasources: { db: { url: url! } } });
		await prisma.$connect();
	});
	beforeEach(async () => {
		await prisma.channelLockSnapshot.deleteMany();
	});
	afterAll(async () => {
		if (prisma) {
			await prisma.channelLockSnapshot.deleteMany();
			await prisma.$disconnect();
		}
	});
	function record(): LockRecord {
		return {
			id: 'guild:channel:channel:role',
			guildId: 'guild',
			targetId: 'channel',
			roleId: 'role',
			kind: 'channel',
			snapshot: 'original',
			operationToken: 'original-token',
			leaseUntil: null,
			expiresAt: null,
			createdAt: new Date()
		};
	}
	it('atomically grants only one restoration lease and preserves dates through raw commands', async () => {
		const store = lockStore(prisma);
		const entry = record();
		await store.create(entry);
		const now = new Date();
		const until = new Date(now.getTime() + 120_000);
		const claims = await Promise.all(Array.from({ length: 16 }, (_, i) => store.claim(entry.id, entry.operationToken, `token-${i}`, now, until)));
		expect(claims.filter(Boolean)).toHaveLength(1);
		const stored = await store.find(entry.id);
		expect(stored?.leaseUntil?.toISOString()).toBe(until.toISOString());
		await store.release(entry.id, 'wrong-token');
		expect((await store.find(entry.id))?.leaseUntil?.toISOString()).toBe(until.toISOString());
		await store.release(entry.id, stored!.operationToken);
		expect((await store.find(entry.id))?.leaseUntil).toBeNull();
	});
	it('recovers an expired lease but refuses to acquire an active one', async () => {
		const store = lockStore(prisma);
		const entry = record();
		entry.leaseUntil = new Date(Date.now() + 120_000);
		await store.create(entry);
		expect(await store.claim(entry.id, entry.operationToken, 'new-token', new Date(), new Date(Date.now() + 120_000))).toBe(false);
		const future = new Date(Date.now() + 240_000);
		expect(await store.claim(entry.id, entry.operationToken, 'new-token', future, new Date(future.getTime() + 120_000))).toBe(true);
	});
	it('makes concurrent locks idempotent, then restores from persisted recovery data', async () => {
		const store = lockStore(prisma);
		let state = 'original';
		let applies = 0;
		let restores = 0;
		const target: LockTarget = {
			id: 'guild:channel:channel:role',
			guildId: 'guild',
			targetId: 'channel',
			roleId: 'role',
			kind: 'channel',
			capture: async () => state,
			apply: async () => {
				applies++;
				state = 'locked';
			},
			restore: async (snapshot) => {
				restores++;
				state = snapshot;
			}
		};
		const attempts = await Promise.all(Array.from({ length: 12 }, () => new LockService(store).lock(target, 'lock')));
		expect(attempts.filter((result) => result === 'locked')).toHaveLength(1);
		expect(applies).toBe(1);
		expect((await store.find(target.id))?.snapshot).toBe('original');
		const outcomes = await Promise.all(Array.from({ length: 12 }, () => new LockService(store).unlock(target, 'restore')));
		expect(outcomes.filter((result) => result === 'restored')).toHaveLength(1);
		expect(restores).toBe(1);
		expect(state).toBe('original');
		expect(await store.find(target.id)).toBeNull();
	});
	it('rejects stale removal tokens without deleting a newer snapshot', async () => {
		const store = lockStore(prisma);
		const entry = record();
		await store.create(entry);
		await expect(store.remove(entry.id, 'wrong-token')).rejects.toThrow('ownership changed');
		expect(await store.find(entry.id)).not.toBeNull();
	});
});
