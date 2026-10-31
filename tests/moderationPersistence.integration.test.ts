import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { ModerationCases } from '../src/lib/moderation/cases.js';
import { ModerationReports } from '../src/lib/moderation/reports.js';
import type { BaseModActionData } from '../src/lib/types/Data.js';

const testUrl = process.env.RADON_TEST_MONGO_URL;
if (testUrl) {
	const url = new URL(testUrl);
	if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !/^\/radon_test_[a-z0-9_]+$/.test(url.pathname))
		throw new Error('Integration tests require a localhost radon_test_* database');
}
const suite = testUrl ? describe : describe.skip;
suite('native moderation persistence with disposable MongoDB', () => {
	const prisma = new PrismaClient({ datasources: { db: { url: testUrl ?? 'mongodb://127.0.0.1:27028/radon_test_unused' } } });
	beforeAll(async () => {
		await prisma.$connect();
		await prisma.moderationCase.deleteMany();
		await prisma.moderationReport.deleteMany();
	});
	afterAll(async () => {
		await prisma.moderationCase.deleteMany();
		await prisma.moderationReport.deleteMany();
		await prisma.$disconnect();
	});
	it('retains every concurrent reason edit with real BSON date fields', async () => {
		const cases = new ModerationCases(prisma);
		const record = await cases.record({
			moderator: { id: 'mod', guild: { id: 'guild' } },
			target: { id: 'user' },
			action: 'ban',
			reason: 'original'
		} as BaseModActionData);
		await Promise.all([cases.editReason('guild', record.id, 'a', 'first'), cases.editReason('guild', record.id, 'b', 'second')]);
		const saved = await cases.get('guild', record.id);
		expect(saved!.reasonEdits).toHaveLength(2);
		expect(saved!.reasonEdits.every((e) => e.createdAt instanceof Date)).toBe(true);
		expect(saved!.reasonEdits[0].previous).toBe('original');
		expect(saved!.reasonEdits[1].previous).toBe(saved!.reasonEdits[0].reason);
	});
	it('allows exactly one review claim and protects the owning moderator', async () => {
		const reports = new ModerationReports(prisma);
		const { report } = await reports.submit({
			guildId: 'guild',
			channelId: 'channel',
			messageId: 'message',
			targetId: 'user',
			reporterId: 'reporter',
			messageUrl: 'https://discord.com/channels/g/c/m',
			excerpt: 'Reported content'
		});
		const claims = await Promise.all([reports.claim('guild', report.id, 'one', 'dismiss'), reports.claim('guild', report.id, 'two', 'dismiss')]);
		expect(claims.filter(Boolean)).toHaveLength(1);
		const owner = claims[0] ? 'one' : 'two';
		expect(await reports.finish('guild', report.id, owner === 'one' ? 'two' : 'one', 'dismissed')).toBe(false);
		expect(await reports.finish('guild', report.id, owner, 'dismissed')).toBe(true);
		expect((await prisma.moderationReport.findUniqueOrThrow({ where: { id: report.id } })).reviewedAt).toBeInstanceOf(Date);
	});
});
