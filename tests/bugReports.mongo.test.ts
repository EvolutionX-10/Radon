import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { BUG_COOLDOWN_MS, BugReports } from '../src/lib/bugs/service.js';

// Never use MONGO or production credentials for tests.
const testUrl = process.env.RADON_BUG_TEST_MONGO;
if (testUrl) {
	const parsed = new URL(testUrl);
	if (
		parsed.protocol !== 'mongodb:' ||
		!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
		!/^\/radon_test_[a-z0-9_]+$/i.test(parsed.pathname) ||
		parsed.username ||
		parsed.password
	)
		throw new Error('RADON_BUG_TEST_MONGO must select an unauthenticated localhost radon_test_* database.');
}
const suite = testUrl ? describe : describe.skip;
const reportInput = (id: string, reporterId = 'reporter') => ({
	id,
	reporterId,
	guildId: 'guild',
	channelId: 'channel',
	summary: 'The command is broken',
	details: 'Run the command with these arguments. Expected a response but received an error.'
});

suite('private bug report persistence against disposable MongoDB', () => {
	let prisma: PrismaClient;
	let service: BugReports;
	beforeAll(() => {
		prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
		service = new BugReports(prisma, ['owner']);
	});
	beforeEach(async () => {
		await prisma.bugReport.deleteMany({});
		await prisma.bugReporter.deleteMany({});
	});
	afterAll(async () => prisma?.$disconnect());
	it('commits report and cooldown together and retains them across service instances', async () => {
		const now = new Date();
		const first = await service.submit(reportInput('one'), now);
		expect(first.created).toBe(true);
		expect((await prisma.bugReporter.findUniqueOrThrow({ where: { id: 'reporter' } })).nextReportAt.getTime()).toBe(
			now.getTime() + BUG_COOLDOWN_MS
		);
		const restarted = new BugReports(prisma, ['owner']);
		await expect(restarted.submit(reportInput('two'), now)).rejects.toMatchObject({ kind: 'cooldown' });
		expect((await restarted.view('owner', 'one'))?.details).toContain('Expected a response');
		expect((await restarted.submit(reportInput('two'), new Date(now.getTime() + BUG_COOLDOWN_MS))).created).toBe(true);
	});
	it('allows one concurrent submission per reporter across shards', async () => {
		const results = await Promise.allSettled(
			Array.from({ length: 15 }, (_, n) => new BugReports(prisma, ['owner']).submit(reportInput(`concurrent-${n}`)))
		);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(await prisma.bugReport.count()).toBe(1);
		expect(results.filter((result) => result.status === 'rejected').every((result: any) => result.reason.kind === 'cooldown')).toBe(true);
	});
	it('replays an acknowledged interaction without creating reports or extending its cooldown', async () => {
		const now = new Date();
		await service.submit(reportInput('same-interaction'), now);
		const replay = await service.submit(reportInput('same-interaction'), new Date(now.getTime() + 60_000));
		expect(replay.created).toBe(false);
		expect(await prisma.bugReport.count()).toBe(1);
		expect((await prisma.bugReporter.findUniqueOrThrow({ where: { id: 'reporter' } })).nextReportAt.getTime()).toBe(
			now.getTime() + BUG_COOLDOWN_MS
		);
	});
	it('rolls back the cooldown when creating the report fails', async () => {
		await expect(service.submit({ ...reportInput('invalid'), guildId: undefined as any })).rejects.toThrow();
		expect(await prisma.bugReport.count()).toBe(0);
		expect(await prisma.bugReporter.count()).toBe(0);
		expect((await service.submit(reportInput('retry'))).created).toBe(true);
	});
	it('persists explicit user bans, protects owners, and restores access without deleting reports', async () => {
		await service.submit(reportInput('evidence'));
		await service.setBan('owner', 'reporter', true, 'Spam reports');
		const restarted = new BugReports(prisma, ['owner']);
		await expect(restarted.submit(reportInput('banned'), new Date(Date.now() + BUG_COOLDOWN_MS))).rejects.toMatchObject({ kind: 'banned' });
		await expect(Promise.resolve().then(() => service.setBan('owner', 'owner', true, 'No'))).rejects.toMatchObject({ kind: 'invalid' });
		await restarted.setBan('owner', 'reporter', false, 'Appeal accepted');
		expect((await restarted.submit(reportInput('restored'), new Date(Date.now() + BUG_COOLDOWN_MS))).created).toBe(true);
		expect(await prisma.bugReport.count()).toBe(2);
	});
	it('paginates tied timestamps without missing reports and filters review status', async () => {
		const now = new Date();
		await prisma.bugReport.createMany({
			data: Array.from({ length: 12 }, (_, n) => ({ ...reportInput(String(n).padStart(2, '0'), `reporter-${n}`), createdAt: now }))
		});
		const first = await service.list('owner', 'open');
		const second = await service.list('owner', 'open', first.next!);
		const third = await service.list('owner', 'open', second.next!);
		const all = [...first.reports, ...second.reports, ...third.reports];
		expect(all).toHaveLength(12);
		expect(new Set(all.map((record) => record.id)).size).toBe(12);
		expect(third.next).toBeNull();
		await service.review('owner', '11', 'resolved', 'Fixed in the next release');
		const reviewed = await service.view('owner', '11');
		expect(reviewed).toMatchObject({ status: 'resolved', reviewerId: 'owner', reviewNote: 'Fixed in the next release' });
		expect(reviewed?.details).toBe(reportInput('11').details);
		expect((await service.list('owner', 'resolved')).reports.map((record) => record.id)).toEqual(['11']);
	});
});
