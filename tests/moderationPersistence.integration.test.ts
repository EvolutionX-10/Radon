import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { ModerationCases } from '../src/lib/moderation/cases.js';
import { ModerationReports } from '../src/lib/moderation/reports.js';
import { TemporaryBans, guardScheduledBanReplacement, finishBanDispatch, recoverBanDispatch } from '../src/lib/moderation/temporaryBans.js';
import type { BaseModActionData } from '../src/lib/types/Data.js';
import type { Client } from 'discord.js';

const testUrl = process.env.RADON_TEST_MONGO_URL;
if (testUrl) {
	const url = new URL(testUrl);
	if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !/^\/radon_test_[a-z0-9_]+$/.test(url.pathname))
		throw new Error('Integration tests require a localhost radon_test_* database');
}
const suite = testUrl ? describe : describe.skip;
suite('native moderation persistence with disposable MongoDB', () => {
	const prisma = new PrismaClient({ datasources: { db: { url: testUrl ?? 'mongodb://127.0.0.1:27028/radon_test_unused' } } });
	async function activate(task: { guildId: string; targetId: string; expectedReason: string; generation: string }, now: Date) {
		const dispatch = await guardScheduledBanReplacement(prisma, task.guildId, task.targetId, task.expectedReason, task.generation, now);
		expect(await finishBanDispatch(prisma, dispatch!, now)).toBe(true);
	}
	beforeAll(async () => {
		await prisma.$connect();
		await prisma.moderationCase.deleteMany();
		await prisma.moderationReport.deleteMany();
		await prisma.moderationScheduledBan.deleteMany();
	});
	afterAll(async () => {
		await prisma.moderationCase.deleteMany();
		await prisma.moderationReport.deleteMany();
		await prisma.moderationScheduledBan.deleteMany();
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
	it('allows one temporary-ban worker to unban after restart and keeps replacement bans', async () => {
		const now = new Date();
		let unbans = 0;
		let currentReason = '';
		const guild = {
			bans: {
				cache: new Map(),
				fetch: async () => ({ reason: currentReason, user: { id: 'user' } }),
				remove: async () => {
					unbans++;
				}
			},
			members: { me: null }
		};
		const client = {
			rest: {
				delete: async () => {
					unbans++;
				}
			},
			guilds: { fetch: async () => guild, cache: new Map([['guild', guild]]) }
		} as unknown as Client;
		const worker = new TemporaryBans(prisma, client);
		const task = await worker.prepare('guild', 'user', 'mod', 'spam', now);
		currentReason = task.expectedReason;
		await activate(task, now);
		const restartA = new TemporaryBans(prisma, client);
		const restartB = new TemporaryBans(prisma, client);
		await Promise.all([restartA.process(task, now), restartB.process(task, now)]);
		expect(unbans).toBe(1);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('completed');
		const replacement = await worker.prepare('guild', 'user', 'mod', 'spam', now);
		await activate(replacement, now);
		currentReason = 'New permanent ban';
		await restartA.process(replacement, now);
		expect(unbans).toBe(1);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('superseded');
	});
	it('coordinates bot-origin replacement bans with active expiry leases', async () => {
		const now = new Date();
		const client = { guilds: { cache: new Map() } } as unknown as Client;
		const worker = new TemporaryBans(prisma, client);
		const task = await worker.prepare('guild', 'replacement-user', 'mod', 'spam', now);
		await activate(task, now);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('scheduled');
		await prisma.$runCommandRaw({
			findAndModify: 'moderationScheduledBan',
			query: { _id: task.id },
			update: { $set: { leaseOwner: 'worker', leaseUntil: { $date: new Date(now.getTime() + 60_000).toISOString() } } },
			new: true
		});
		await expect(guardScheduledBanReplacement(prisma, 'guild', 'replacement-user', 'new permanent reason', undefined, now)).rejects.toThrow(
			'changed concurrently'
		);
		await prisma.$runCommandRaw({
			findAndModify: 'moderationScheduledBan',
			query: { _id: task.id },
			update: { $set: { leaseOwner: null, leaseUntil: null } },
			new: true
		});
		const reservation = await guardScheduledBanReplacement(prisma, 'guild', 'replacement-user', 'new permanent reason', undefined, now);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('scheduled');
		await finishBanDispatch(prisma, reservation!, now);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('cancelled');
	});
	it('refuses an actual unban if a slow read outlives its persisted lease', async () => {
		const now = new Date();
		let unbans = 0;
		let marker = '';
		const guild = {
			id: 'guild',
			bans: { cache: new Map(), fetch: async () => ({ reason: marker, user: { id: 'slow-user' } }) },
			members: { me: null }
		};
		const client = {
			rest: {
				delete: async () => {
					unbans++;
				}
			},
			guilds: { fetch: async () => guild, cache: new Map([['guild', guild]]) }
		} as unknown as Client;
		const worker = new TemporaryBans(
			prisma,
			client,
			() => undefined,
			() => new Date(now.getTime() + 11 * 60_000)
		);
		const task = await worker.prepare('guild', 'slow-user', 'mod', 'spam', now);
		marker = task.expectedReason;
		await activate(task, now);
		await worker.process(task, now);
		expect(unbans).toBe(0);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('scheduled');
	});
	it('does not dispatch after cancellation and cannot alter a newer generation', async () => {
		const now = new Date();
		const worker = new TemporaryBans(prisma, {} as Client);
		const old = await worker.prepare('guild', 'cancel-race', 'mod', 'spam', now);
		expect(await worker.cancel('guild', 'cancel-race', now)).toBe(true);
		await expect(guardScheduledBanReplacement(prisma, 'guild', 'cancel-race', old.expectedReason, old.generation, now)).rejects.toThrow(
			'cancelled or replaced'
		);
		const newer = await worker.prepare('guild', 'cancel-race', 'mod', 'new spam', now);
		await expect(guardScheduledBanReplacement(prisma, 'guild', 'cancel-race', old.expectedReason, old.generation, now)).rejects.toThrow(
			'cancelled or replaced'
		);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: newer.id } })).status).toBe('preparing');
		const reservation = (await guardScheduledBanReplacement(prisma, 'guild', 'cancel-race', newer.expectedReason, newer.generation, now))!;
		expect(await worker.cancel('guild', 'cancel-race', now)).toBe(false);
		const wrongOwner = { ...reservation, owner: 'not-the-dispatch-owner' };
		expect(await finishBanDispatch(prisma, wrongOwner, now)).toBe(false);
		expect(await finishBanDispatch(prisma, reservation, now)).toBe(true);
	});
	it('preserves a rejected replacement schedule and a network-unknown dispatch lease', async () => {
		const now = new Date();
		const worker = new TemporaryBans(prisma, {} as Client);
		const task = await worker.prepare('guild', 'replacement-failure', 'mod', 'spam', now);
		await activate(task, now);
		const reservation = (await guardScheduledBanReplacement(prisma, 'guild', 'replacement-failure', 'permanent', undefined, now))!;
		await recoverBanDispatch(prisma, reservation, new Error('403'), true, now);
		let stored = await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } });
		expect(stored.status).toBe('scheduled');
		expect(stored.leaseOwner).toBeNull();
		const unknown = (await guardScheduledBanReplacement(prisma, 'guild', 'replacement-failure', 'permanent', undefined, now))!;
		await recoverBanDispatch(prisma, unknown, new Error('Network timeout'), false, now);
		stored = await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } });
		expect(stored.status).toBe('scheduled');
		expect(stored.leaseOwner).toBe(unknown.owner);
		expect(await worker.cancel('guild', 'replacement-failure', now)).toBe(false);
	});
	it('loses dispatch safely when cancellation commits between its read and reservation', async () => {
		const now = new Date();
		const worker = new TemporaryBans(prisma, {} as Client);
		const task = await worker.prepare('guild', 'between-read-and-claim', 'mod', 'spam', now);
		const racingPrisma = {
			moderationScheduledBan: {
				findUnique: async () => {
					const staleRead = await prisma.moderationScheduledBan.findUnique({ where: { id: task.id } });
					expect(await worker.cancel('guild', task.targetId, now)).toBe(true);
					return staleRead;
				}
			},
			$runCommandRaw: prisma.$runCommandRaw.bind(prisma)
		} as unknown as PrismaClient;
		await expect(guardScheduledBanReplacement(racingPrisma, 'guild', task.targetId, task.expectedReason, task.generation, now)).rejects.toThrow(
			'changed concurrently'
		);
		expect((await prisma.moderationScheduledBan.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('cancelled');
	});
});
