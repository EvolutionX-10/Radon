import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { IntentsBitField } from 'discord.js';
import { draftConfiguration, readConfiguration, saveSetup } from '../src/lib/setup/configuration.js';
import { setupFixture, ids } from './fixtures/setup.js';
import { diagnosticPages } from '../src/lib/setup/diagnostics.js';
import { componentMessage } from '../src/lib/presentation/components.js';
import { displayText } from './fixtures/presentation.js';

// Reuse CI's guarded disposable database; never read MONGO or production credentials.
const connection = process.env.RADON_TEST_MONGO_URL;
if (connection) {
	const url = new URL(connection);
	if (
		url.protocol !== 'mongodb:' ||
		!['127.0.0.1', 'localhost'].includes(url.hostname) ||
		url.port !== '27028' ||
		!/^\/radon_test_[a-z0-9_]+$/.test(url.pathname) ||
		url.username ||
		url.password
	)
		throw new Error('Setup integration tests require unauthenticated localhost:27028/radon_test_* MongoDB.');
}
const suite = connection ? describe : describe.skip;
suite('setup MongoDB transaction and stale-review protection', () => {
	const prisma = new PrismaClient({ datasources: { db: { url: connection ?? 'mongodb://127.0.0.1:27028/radon_test_disabled' } } });
	const records: string[] = [];
	beforeAll(async () => {
		await prisma.$connect();
		// Existing deployment collections, created outside transactions as in normal rollout.
		for (const name of ['guildSettings', 'moderationReportSettings', 'automodConfig']) {
			try {
				await prisma.$runCommandRaw({ create: name });
			} catch (error) {
				if (!(error as Error).message.includes('already exists')) throw error;
			}
		}
	});
	afterAll(async () => {
		if (records.length)
			await Promise.all([
				prisma.guildSettings.deleteMany({ where: { id: { in: records } } }),
				prisma.moderationReportSettings.deleteMany({ where: { id: { in: records } } }),
				prisma.automodConfig.deleteMany({ where: { id: { in: records } } }),
				prisma.channelLockSnapshot.deleteMany({ where: { guildId: { in: records } } }),
				prisma.moderationScheduledBan.deleteMany({ where: { guildId: { in: records } } }),
				prisma.moderationReport.deleteMany({ where: { guildId: { in: records } } })
			]);
		await prisma.$disconnect();
	});
	async function fixture() {
		const f = setupFixture();
		f.guild.id = `setup-${randomUUID()}`;
		records.push(f.guild.id);
		const initial = await readConfiguration(prisma, f.guild.id);
		const draft = draftConfiguration(initial);
		draft.modRoles = [ids.mod];
		draft.log = 'existing';
		draft.logChannelId = ids.log;
		draft.reports = 'existing';
		draft.reportChannelId = ids.report;
		return { ...f, initial, draft };
	}
	it('commits roles, report routing and optional observers together without new schema fields', async () => {
		const f = await fixture();
		f.guild.client.options.intents = new IntentsBitField(['MessageContent', 'GuildMembers']);
		f.draft.protection = ['flood', 'raid'];
		await saveSetup(prisma, f.guild as any, ids.actor, f.initial, f.draft);
		const result = await readConfiguration(prisma, f.guild.id);
		expect(result.settings).toMatchObject({ configured: true, modRoles: [ids.mod], modLogChannel: ids.log });
		expect(result.reports?.channelId).toBe(ids.report);
		expect(result.automod).toMatchObject({ floodMode: 'observe', raidMode: 'observe', linkMode: 'off', alertChannelId: ids.log });
	});
	it('rolls back all collections when a transaction fails after writing them', async () => {
		const f = await fixture();
		const failing = {
			guildSettings: prisma.guildSettings,
			moderationReportSettings: prisma.moderationReportSettings,
			automodConfig: prisma.automodConfig,
			$transaction: (run: any) =>
				prisma.$transaction(async (tx) => {
					await run(tx);
					throw new Error('Simulated failure after writes');
				})
		};
		await expect(saveSetup(failing as any, f.guild as any, ids.actor, f.initial, f.draft)).rejects.toThrow('could not be confirmed');
		expect(await readConfiguration(prisma, f.guild.id)).toEqual(f.initial);
	});
	it('allows one writer across concurrent saves of the same reviewed snapshot', async () => {
		const f = await fixture();
		const results = await Promise.allSettled(Array.from({ length: 6 }, () => saveSetup(prisma, f.guild as any, ids.actor, f.initial, f.draft)));
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect((await readConfiguration(prisma, f.guild.id)).settings?.modRoles).toEqual([ids.mod]);
	});
	it('rejects a changed report destination and preserves it instead of saving a stale review', async () => {
		const f = await fixture();
		await prisma.moderationReportSettings.create({ data: { id: f.guild.id, channelId: 'changed-by-another-admin' } });
		await expect(saveSetup(prisma, f.guild as any, ids.actor, f.initial, f.draft)).rejects.toThrow('Configuration changed');
		expect((await readConfiguration(prisma, f.guild.id)).reports?.channelId).toBe('changed-by-another-admin');
		expect(await prisma.guildSettings.findUnique({ where: { id: f.guild.id } })).toBeNull();
	});
	it('explicitly disables report routing without deleting previously submitted reports', async () => {
		const f = await fixture();
		const report = await prisma.moderationReport.create({
			data: {
				id: randomUUID(),
				guildId: f.guild.id,
				channelId: ids.report,
				messageId: ids.log,
				targetId: ids.mod,
				reporterId: ids.actor,
				messageUrl: 'https://discord.com/channels/1/2/3',
				excerpt: 'Staff evidence'
			}
		});
		await saveSetup(prisma, f.guild as any, ids.actor, f.initial, f.draft);
		const fresh = await readConfiguration(prisma, f.guild.id);
		const draft = draftConfiguration(fresh);
		draft.reports = 'none';
		await saveSetup(prisma, f.guild as any, ids.actor, fresh, draft);
		expect((await readConfiguration(prisma, f.guild.id)).reports).toBeNull();
		expect((await readConfiguration(prisma, f.guild.id)).settings?.configured).toBe(true);
		expect((await prisma.moderationReport.findUniqueOrThrow({ where: { id: report.id } })).excerpt).toBe('Staff evidence');
	});
	it('counts only this guild’s overdue recovery, including legacy missing lease fields', async () => {
		const f = await fixture(),
			other = await fixture();
		const past = new Date(Date.now() - 120_000),
			future = new Date(Date.now() + 120_000);
		const jobs = [
			{ guildId: f.guild.id, leaseUntil: undefined, nextAttemptAt: past, expiresAt: past },
			{ guildId: f.guild.id, leaseUntil: future, nextAttemptAt: past, expiresAt: past },
			{ guildId: f.guild.id, leaseUntil: null, nextAttemptAt: future, expiresAt: past },
			{ guildId: f.guild.id, leaseUntil: null, nextAttemptAt: past, expiresAt: future },
			{ guildId: other.guild.id, leaseUntil: null, nextAttemptAt: past, expiresAt: past }
		];
		for (const job of jobs) {
			await prisma.channelLockSnapshot.create({
				data: {
					id: randomUUID(),
					guildId: job.guildId,
					targetId: ids.log,
					roleId: ids.guild,
					kind: 'text',
					snapshot: '{}',
					operationToken: randomUUID(),
					leaseUntil: job.leaseUntil,
					expiresAt: job.expiresAt,
					retryAfter: job.leaseUntil === undefined ? undefined : job.nextAttemptAt,
					createdAt: past
				}
			});
			await prisma.moderationScheduledBan.create({
				data: {
					id: randomUUID(),
					guildId: job.guildId,
					generation: randomUUID(),
					targetId: ids.mod,
					actorId: ids.actor,
					expectedReason: 'test',
					dueAt: job.expiresAt,
					status: 'scheduled',
					leaseUntil: job.leaseUntil,
					nextAttemptAt: job.nextAttemptAt
				}
			});
		}
		const pages = await diagnosticPages(prisma, f.guild as any);
		const report = pages.map((page) => displayText(componentMessage(page))).join('\n');
		expect(report).toContain('1 temporary ban(s) overdue');
		expect(report).toContain('1 timed lock(s) overdue');
	});
});
