import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { GuildVerificationLevel, type Guild, type GuildMember } from 'discord.js';
import { AutoModService, raidRecoveryWhere } from '../src/lib/automod/service.js';
import { RaidLease } from '../src/lib/automod/lease.js';

const connection = process.env.RADON_TEST_MONGO_URL;
if (connection) {
	const url = new URL(connection);
	if (
		url.protocol !== 'mongodb:' ||
		!['localhost', '127.0.0.1'].includes(url.hostname) ||
		url.port !== '27028' ||
		!/^\/radon_test_[a-z0-9_]+$/.test(url.pathname)
	)
		throw new Error('AutoMod integration tests require disposable localhost:27028/radon_test_* MongoDB.');
}

const integration = connection ? describe : describe.skip;
integration('AutoMod MongoDB atomic recovery', () => {
	const prisma = new PrismaClient({ datasources: { db: { url: connection ?? 'mongodb://127.0.0.1:27028/radon_test_disabled' } } });
	const ids: string[] = [];
	beforeAll(async () => {
		await prisma.$connect();
	});
	afterAll(async () => {
		if (ids.length) await prisma.automodConfig.deleteMany({ where: { id: { in: ids } } });
		await prisma.$disconnect();
	});

	async function fixture() {
		const id = `automod-${randomUUID()}`;
		ids.push(id);
		await prisma.automodConfig.create({
			data: {
				id,
				alertChannelId: 'alerts',
				exemptRoleIds: [],
				exemptChannelIds: [],
				blockedDomains: [],
				allowedDomains: [],
				raidMode: 'enforce',
				raidThreshold: 3,
				raidRestoreAt: null,
				raidRestoreLevel: null
			}
		});
		let changes = 0;
		const guild = {
			id,
			verificationLevel: GuildVerificationLevel.Low,
			fetch: async () => guild,
			setVerificationLevel: async (level: number) => {
				changes++;
				guild.verificationLevel = level;
				return guild;
			},
			channels: { fetch: async () => ({ isTextBased: () => true, isSendable: () => true, send: async () => undefined }) }
		};
		const member = { guild, user: { bot: false } } as unknown as GuildMember;
		return { id, guild, member, changes: () => changes };
	}

	it('allows one restriction writer across concurrent service instances', async () => {
		const f = await fixture();
		const services = Array.from({ length: 8 }, () => new AutoModService());
		await Promise.all(
			services.map(async (service) => {
				await service.join(prisma, f.member);
				await service.join(prisma, f.member);
				await service.join(prisma, f.member);
			})
		);
		expect(f.changes()).toBe(1);
		const saved = await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } });
		expect(saved.raidRestoreLevel).toBe(GuildVerificationLevel.Low);
		expect(saved.raidRestoreAt!.getTime()).toBeGreaterThan(Date.now());
	});
	it('reads configurations created before approved invite lists as an empty list', async () => {
		const f = await fixture();
		await prisma.$runCommandRaw({ update: 'automodConfig', updates: [{ q: { _id: f.id }, u: { $unset: { allowedInviteCodes: '' } } }] });
		expect((await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } })).allowedInviteCodes).toEqual([]);
	});
	it('rejects a stale lease token without clearing another worker recovery state', async () => {
		const f = await fixture();
		const until = new Date(Date.now() + 300_000);
		await prisma.automodConfig.update({
			where: { id: f.id },
			data: {
				raidRestoreAt: new Date(Date.now() - 1000),
				raidRestoreLevel: GuildVerificationLevel.Low,
				raidLeaseToken: 'other-worker',
				raidLeaseUntil: until
			}
		});
		const stale = new RaidLease(prisma, f.id, 'stale-worker', until, {
			leaseMilliseconds: 300_000,
			renewMilliseconds: 60_000,
			retryMilliseconds: 60_000
		});
		try {
			await expect(stale.assertOwned()).rejects.toThrow('ownership');
		} finally {
			await stale.stop();
		}
		const saved = await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } });
		expect(saved.raidLeaseToken).toBe('other-worker');
		expect(saved.raidRestoreAt).not.toBeNull();
	});

	it('allows one recovery lease, restores persisted state and clears only owned work', async () => {
		const f = await fixture();
		f.guild.verificationLevel = GuildVerificationLevel.VeryHigh;
		await prisma.automodConfig.update({
			where: { id: f.id },
			data: { raidRestoreAt: new Date(Date.now() - 1000), raidRestoreLevel: GuildVerificationLevel.Low }
		});
		await Promise.all(Array.from({ length: 8 }, () => new AutoModService().restoreRaid(prisma, f.guild as unknown as Guild)));
		expect(f.changes()).toBe(1);
		expect(f.guild.verificationLevel).toBe(GuildVerificationLevel.Low);
		const saved = await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } });
		expect(saved.raidRestoreAt).toBeNull();
		expect(saved.raidLeaseToken).toBeNull();
	});

	it('recovers an expired lease left by a terminated worker', async () => {
		const f = await fixture();
		f.guild.verificationLevel = GuildVerificationLevel.VeryHigh;
		await prisma.automodConfig.update({
			where: { id: f.id },
			data: {
				raidRestoreAt: new Date(Date.now() - 1000),
				raidRestoreLevel: GuildVerificationLevel.Low,
				raidLeaseToken: 'old-worker',
				raidLeaseUntil: new Date(Date.now() - 1000)
			}
		});
		await new AutoModService().restoreRaid(prisma, f.guild as unknown as Guild);
		expect(f.changes()).toBe(1);
		expect((await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } })).raidRestoreAt).toBeNull();
	});

	it('protects a delayed apply from another instance disabling protection and coalesces further joins', async () => {
		const f = await fixture();
		let applied!: () => void;
		let release!: () => void;
		const started = new Promise<void>((resolve) => {
			applied = resolve;
		});
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const original = f.guild.setVerificationLevel;
		f.guild.setVerificationLevel = async (level) => {
			if (level === GuildVerificationLevel.VeryHigh) {
				applied();
				await gate;
			}
			return original(level);
		};
		const service = new AutoModService();
		await service.join(prisma, f.member);
		await service.join(prisma, f.member);
		const applying = service.join(prisma, f.member);
		await started;
		try {
			await prisma.automodConfig.update({ where: { id: f.id }, data: { raidMode: 'off' } });
			await new AutoModService().restoreRaid(prisma, f.guild as unknown as Guild, true);
			expect((await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } })).raidRestoreAt).not.toBeNull();
			const coalesced = await Promise.race([
				Promise.all(Array.from({ length: 500 }, () => service.join(prisma, f.member))).then(() => true),
				new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500))
			]);
			expect(coalesced).toBe(true);
		} finally {
			release();
			await applying;
		}
		expect(f.guild.verificationLevel).toBe(GuildVerificationLevel.Low);
		expect((await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } })).raidRestoreAt).toBeNull();
	});

	it('renews a delayed apply lease beyond its initial deadline and reconciles expiry before release', async () => {
		const f = await fixture();
		let applied!: () => void;
		let release!: () => void;
		const started = new Promise<void>((resolve) => {
			applied = resolve;
		});
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const original = f.guild.setVerificationLevel;
		f.guild.setVerificationLevel = async (level) => {
			if (level === GuildVerificationLevel.VeryHigh) {
				applied();
				await gate;
			}
			return original(level);
		};
		const service = new AutoModService({ leaseMilliseconds: 400, renewMilliseconds: 40, retryMilliseconds: 100 });
		await service.join(prisma, f.member);
		await service.join(prisma, f.member);
		const applying = service.join(prisma, f.member);
		await started;
		try {
			await prisma.automodConfig.update({ where: { id: f.id }, data: { raidRestoreAt: new Date(Date.now() - 1000) } });
			await new Promise((resolve) => setTimeout(resolve, 650));
			const pending = await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } });
			expect(pending.raidLeaseUntil!.getTime()).toBeGreaterThan(Date.now());
			await new AutoModService().restoreRaid(prisma, f.guild as unknown as Guild);
			expect((await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } })).raidRestoreAt).not.toBeNull();
		} finally {
			release();
			await applying;
		}
		expect(f.guild.verificationLevel).toBe(GuildVerificationLevel.Low);
		expect((await prisma.automodConfig.findUniqueOrThrow({ where: { id: f.id } })).raidRestoreAt).toBeNull();
	});

	it('keeps failed restorations on backoff and filters null records and other shards before limiting', async () => {
		const failed = await fixture();
		failed.guild.verificationLevel = GuildVerificationLevel.VeryHigh;
		await prisma.automodConfig.update({
			where: { id: failed.id },
			data: { raidRestoreAt: new Date(Date.now() - 1000), raidRestoreLevel: GuildVerificationLevel.Low }
		});
		failed.guild.setVerificationLevel = async () => {
			throw new Error('permission denied');
		};
		await expect(new AutoModService().restoreRaid(prisma, failed.guild as unknown as Guild)).rejects.toThrow();
		const deferred = await prisma.automodConfig.findUniqueOrThrow({ where: { id: failed.id } });
		expect(deferred.raidLeaseUntil!.getTime()).toBeGreaterThan(Date.now());
		expect(deferred.raidRestoreAt).not.toBeNull();
		const inactive = await fixture();
		const due = await fixture();
		const otherShard = await fixture();
		await prisma.automodConfig.update({
			where: { id: due.id },
			data: { raidRestoreAt: new Date(Date.now() - 500), raidRestoreLevel: GuildVerificationLevel.Low }
		});
		await prisma.automodConfig.update({
			where: { id: otherShard.id },
			data: { raidRestoreAt: new Date(Date.now() - 2000), raidRestoreLevel: GuildVerificationLevel.Low }
		});
		const candidates = await prisma.automodConfig.findMany({
			where: raidRecoveryWhere([failed.id, inactive.id, due.id], new Date()),
			orderBy: [{ raidRestoreAt: 'asc' }, { id: 'asc' }],
			take: 1
		});
		expect(candidates.map((record) => record.id)).toEqual([due.id]);
	});
});
