import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { deleteMemberCode, PrismaReceipts, saveMemberCode } from '../src/lib/redemption/persistence.js';

// Explicit disposable database only: never read MONGO or any production variable.
const testUrl = process.env.RADON_REDEMPTION_TEST_MONGO;
if (testUrl) {
	const parsed = new URL(testUrl);
	if (
		parsed.protocol !== 'mongodb:' ||
		!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
		!/^\/radon_test_[a-z0-9_]+$/i.test(parsed.pathname) ||
		parsed.username ||
		parsed.password
	) {
		throw new Error('RADON_REDEMPTION_TEST_MONGO must select an unauthenticated localhost radon_test_* database.');
	}
}
const suite = testUrl ? describe : describe.skip;
suite('redemption persistence against disposable MongoDB', () => {
	let prisma: PrismaClient;
	let receipts: PrismaReceipts;
	beforeAll(() => {
		prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
		receipts = new PrismaReceipts(prisma);
	});
	beforeEach(async () => {
		await prisma.memberCodes.deleteMany({});
		await prisma.redemptionReceipt.deleteMany({});
		await prisma.redemptionAccountLabel.deleteMany({});
	});
	afterAll(async () => {
		await prisma?.$disconnect();
	});
	it('allows exactly one winner when multiple processes reserve an absent receipt', async () => {
		const results = await Promise.all(Array.from({ length: 30 }, () => new PrismaReceipts(prisma).reserve('same', 60_000)));
		expect(results.filter((result) => result.kind === 'acquired')).toHaveLength(1);
		expect(await prisma.redemptionReceipt.count()).toBe(1);
	});
	it('atomically reclaims an expired receipt and rejects stale owners completing or releasing it', async () => {
		const first = await receipts.reserve('lease', 60_000);
		if (first.kind !== 'acquired') throw new Error('Missing first reservation');
		await prisma.redemptionReceipt.update({ where: { id: 'lease' }, data: { expiresAt: new Date(0) } });
		const claims = await Promise.all(Array.from({ length: 30 }, () => receipts.reserve('lease', 60_000)));
		const winner = claims.find((result) => result.kind === 'acquired');
		expect(claims.filter((result) => result.kind === 'acquired')).toHaveLength(1);
		if (!winner || winner.kind !== 'acquired') throw new Error('Missing successor reservation');
		await receipts.finish('lease', first.token, 'success');
		expect((await prisma.redemptionReceipt.findUniqueOrThrow({ where: { id: 'lease' } })).status).toBe('pending');
		await receipts.finish('lease', first.token, 'release');
		expect(await prisma.redemptionReceipt.count()).toBe(1);
		await receipts.finish('lease', winner.token, 'success');
		expect((await receipts.reserve('lease', 1)).kind).toBe('succeeded');
	});
	it('roundtrips native EJSON dates and preserves the longest concurrent provider cooldown', async () => {
		const start = Date.now();
		await Promise.all([10_000, 60_000, 20_000, 5_000].map((duration) => receipts.block('provider:netmarble', duration)));
		const record = await prisma.redemptionReceipt.findUniqueOrThrow({ where: { id: 'provider:netmarble' } });
		expect(record.expiresAt).toBeInstanceOf(Date);
		expect(record.expiresAt.getTime()).toBeGreaterThanOrEqual(start + 60_000);
		expect((await receipts.reserve('provider:netmarble', 1_000)).kind).toBe('busy');
	});
	it('keeps at most five distinct accounts under concurrent first-time saves', async () => {
		const results = await Promise.allSettled(
			Array.from({ length: 20 }, (_, index) => saveMemberCode(prisma, 'concurrent-user', String(index).padStart(32, 'A')))
		);
		const record = await prisma.memberCodes.findUniqueOrThrow({ where: { id: 'concurrent-user' } });
		expect(record.memberCodes).toHaveLength(5);
		expect(new Set(record.memberCodes).size).toBe(5);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(5);
	});
	it('retains simultaneous additions and deletions without recreating removed accounts', async () => {
		await prisma.memberCodes.create({ data: { id: 'legacy-user', memberCodes: ['A'.repeat(32), 'B'.repeat(32)] } });
		await Promise.all([deleteMemberCode(prisma, 'legacy-user', 'A'.repeat(32)), saveMemberCode(prisma, 'legacy-user', 'C'.repeat(32))]);
		const record = await prisma.memberCodes.findUniqueOrThrow({ where: { id: 'legacy-user' } });
		expect(record.memberCodes.sort()).toEqual(['B'.repeat(32), 'C'.repeat(32)]);
	});
});
