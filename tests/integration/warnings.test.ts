import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import type { Guild, GuildMember } from 'discord.js';
import { Warn } from '../../src/lib/structures/classes/Warn.js';

// Deliberately never fall back to MONGO: these tests must only use an explicit,
// disposable local database, even when production credentials are inherited.
const url = process.env.RADON_TEST_MONGO_URL;
if (url) {
	const parsed = new URL(url);
	if (
		parsed.protocol !== 'mongodb:' ||
		!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
		!/^\/radon_test_[a-z0-9_]+$/i.test(parsed.pathname)
	) {
		throw new Error('RADON_TEST_MONGO_URL must point to a localhost MongoDB database named radon_test_*.');
	}
}

const member = { id: 'member' } as GuildMember;
const moderator = { id: 'moderator' } as GuildMember;
const guildIds: string[] = [];
let prisma: PrismaClient;

function createWarnings() {
	const id = `radon-warnings-${crypto.randomUUID()}`;
	guildIds.push(id);
	return { guild: { id } as Guild, warns: new Warn({ id } as Guild, prisma) };
}

function warning(id: string) {
	return { id, date: new Date(), expiration: new Date(Date.now() + 3_600_000), mod: moderator.id, severity: 1, reason: 'reason' };
}

function add(warns: Warn, id: string) {
	return warns.add({ warnId: id, member, reason: 'reason', severity: 1, expiration: new Date(Date.now() + 3_600_000), mod: moderator });
}

describe.skipIf(!url)('warnings against disposable local MongoDB', () => {
	beforeAll(async () => {
		prisma = new PrismaClient({ datasources: { db: { url: url! } } });
		await prisma.$connect();
		await prisma.$runCommandRaw({ ping: 1 });
	});

	afterAll(async () => {
		if (!prisma) return;
		try {
			if (guildIds.length) await prisma.$runCommandRaw({ delete: 'guildWarns', deletes: [{ q: { _id: { $in: guildIds } }, limit: 0 }] });
		} finally {
			await prisma.$disconnect();
		}
	});

	it('preserves parallel first writes across independent Warn instances and maps native dates/IDs', async () => {
		const { guild, warns } = createWarnings();
		await Promise.all(Array.from({ length: 12 }, (_, i) => add(i % 2 ? warns : new Warn(guild, prisma), `warning-${i}`)));
		const stored = await prisma.guildWarns.findUniqueOrThrow({ where: { id: guild.id } });
		expect(stored.revision).toBe(12);
		expect(stored.warnlist[0].id).toBe(member.id);
		expect(stored.warnlist[0].warns.map((entry) => entry.id).sort()).toEqual(Array.from({ length: 12 }, (_, i) => `warning-${i}`).sort());
		expect(stored.warnlist[0].warns.every((entry) => entry.date instanceof Date && entry.expiration instanceof Date)).toBe(true);
		expect(stored.updatedAt).toBeInstanceOf(Date);
	}, 30_000);

	it('upgrades missing revisions and does not lose concurrent reason edits, removals, or new warnings', async () => {
		const { guild, warns } = createWarnings();
		await prisma.guildWarns.create({
			data: { id: guild.id, actions: [], warnlist: [{ id: member.id, warns: [warning('edit'), warning('remove')] }] }
		});
		await Promise.all([warns.updateReason(member.id, 'edit', 'corrected'), warns.remove('remove', member), add(warns, 'new')]);
		const stored = await prisma.guildWarns.findUniqueOrThrow({ where: { id: guild.id } });
		expect(stored.revision).toBe(3);
		expect(stored.warnlist[0].warns.map((entry) => [entry.id, entry.reason])).toEqual([
			['edit', 'corrected'],
			['new', 'reason']
		]);
	}, 30_000);

	it('enforces warning and action limits under simultaneous writes', async () => {
		const { guild, warns } = createWarnings();
		await prisma.guildWarns.create({
			data: {
				id: guild.id,
				warnlist: [{ id: member.id, warns: Array.from({ length: 49 }, (_, i) => warning(`old-${i}`)) }],
				actions: Array.from({ length: 9 }, (_, i) => ({ action: 'kick', severity: i + 1 }))
			}
		});
		const additions = await Promise.all([add(warns, 'first'), add(warns, 'second')]);
		const actions = await Promise.all([warns.addAction({ action: 'kick', severity: 10 }), warns.addAction({ action: 'ban', severity: 11 })]);
		expect(additions.filter(Boolean)).toHaveLength(1);
		expect(actions.filter(Boolean)).toHaveLength(1);
		const stored = await prisma.guildWarns.findUniqueOrThrow({ where: { id: guild.id } });
		expect(stored.warnlist[0].warns).toHaveLength(50);
		expect(stored.actions).toHaveLength(10);
	}, 30_000);

	it('creates one threshold snapshot and one action per severity under contention', async () => {
		const { guild, warns } = createWarnings();
		await prisma.guildWarns.create({ data: { id: guild.id, actions: [], warnlist: [{ id: member.id, warns: [warning('old')] }] } });
		const added = await Promise.all([add(warns, 'first'), add(warns, 'second')]);
		expect(added.filter((entry) => entry!.previousSeverity < 2 && entry!.severity >= 2)).toHaveLength(1);
		const actions = await Promise.all([warns.addAction({ action: 'kick', severity: 5 }), warns.addAction({ action: 'ban', severity: 5 })]);
		expect(actions.filter(Boolean)).toHaveLength(1);
		expect(actions).toContain(null);
	}, 30_000);
});
