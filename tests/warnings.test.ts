import { describe, expect, it } from 'bun:test';
import type { guildWarns as GuildWarnings, PrismaClient } from '@prisma/client';
import type { Guild, GuildMember } from 'discord.js';
import { Warn } from '../src/lib/structures/classes/Warn.js';

const member = { id: 'member' } as GuildMember;
const moderator = { id: 'moderator' } as GuildMember;
const guild = { id: 'guild' } as Guild;

function warning(id: string, expiration = new Date(Date.now() + 3_600_000), severity = 1) {
	return { id, date: new Date(), expiration, mod: moderator.id, severity, reason: 'reason' };
}

function document(overrides: Partial<GuildWarnings> = {}): GuildWarnings {
	return { id: guild.id, warnlist: [], actions: [], revision: 0, createdAt: null, updatedAt: null, ...overrides };
}

/** Models atomic Mongo conditional writes, including simultaneous stale reads. */
function database(initial: GuildWarnings | null = null) {
	let current = initial ? structuredClone(initial) : null;
	let reads = 0;
	let writes = 0;
	const conditions: unknown[] = [];
	const store = {
		async findUnique() {
			reads++;
			return structuredClone(current);
		},
		async create({ data }: { data: GuildWarnings }) {
			if (current) throw Object.assign(new Error('Duplicate guild'), { code: 'P2002' });
			current = structuredClone(data);
			writes++;
			return structuredClone(current);
		}
	};
	const runCommandRaw = async (command: {
		updates: Array<{
			q: { _id: string; revision?: number; $or?: Array<{ revision: number | null }> };
			u: {
				$set: {
					warnlist: Array<{
						_id: string;
						warns: Array<{
							_id: string;
							date: { $date: string };
							expiration: { $date: string } | null;
							mod: string;
							reason: string;
							severity: number;
						}>;
					}>;
					actions: GuildWarnings['actions'];
					revision: number;
					updatedAt: { $date: string };
				};
			};
		}>;
	}) => {
		conditions.push(structuredClone(command));
		const { q, u } = command.updates[0];
		const matches =
			current &&
			current.id === q._id &&
			(q.$or
				? q.$or.some(({ revision }) => (revision === null ? current!.revision == null : current!.revision === revision))
				: current.revision === q.revision);
		if (!matches) return { ok: 1, n: 0, nModified: 0 };
		const fields = u.$set;
		current = {
			...current!,
			warnlist: fields.warnlist.map((person) => ({
				id: person._id,
				warns: person.warns.map((warn) => ({
					id: warn._id,
					date: new Date(warn.date.$date),
					expiration: warn.expiration ? new Date(warn.expiration.$date) : (null as unknown as Date),
					mod: warn.mod,
					reason: warn.reason,
					severity: warn.severity
				}))
			})),
			actions: structuredClone(fields.actions),
			revision: fields.revision,
			updatedAt: new Date(fields.updatedAt.$date)
		};
		writes++;
		return { ok: 1, n: 1, nModified: 1 };
	};
	return {
		prisma: { guildWarns: store, $runCommandRaw: runCommandRaw } as unknown as PrismaClient,
		store,
		state: () => structuredClone(current),
		reads: () => reads,
		writes: () => writes,
		conditions
	};
}

function add(warns: Warn, id: string, target = member, severity = 1) {
	return warns.add({ warnId: id, member: target, reason: 'reason', severity, expiration: new Date(Date.now() + 3_600_000), mod: moderator });
}

describe('atomic warning persistence', () => {
	it('preserves simultaneous first writes, including writes from separate instances', async () => {
		const db = database();
		const first = new Warn(guild, db.prisma);
		const second = new Warn(guild, db.prisma);
		await Promise.all([add(first, 'one'), add(second, 'two')]);
		expect(
			db
				.state()!
				.warnlist[0].warns.map((entry) => entry.id)
				.sort()
		).toEqual(['one', 'two']);
		expect(db.state()!.revision).toBe(2);
		expect(db.reads()).toBeGreaterThan(2);
	});

	it('preserves different members and action changes that race on the same guild', async () => {
		const db = database(document());
		const warns = new Warn(guild, db.prisma);
		await Promise.all([
			add(warns, 'one'),
			add(warns, 'two', { id: 'other-member' } as GuildMember),
			warns.addAction({ action: 'kick', severity: 5 })
		]);
		expect(db.state()!.warnlist).toHaveLength(2);
		expect(db.state()!.actions).toEqual([{ action: 'kick', severity: 5, expiration: null }]);
	});

	it('updates legacy documents with missing and null revisions without migrating existing warnings', async () => {
		for (const missing of [true, false]) {
			const legacy = document({ revision: null, warnlist: [{ id: member.id, warns: [warning('existing')] }] });
			if (missing) delete (legacy as Partial<GuildWarnings>).revision;
			const db = database(legacy);
			await add(new Warn(guild, db.prisma), 'new');
			expect(db.state()!.warnlist[0].warns.map((entry) => entry.id)).toEqual(['existing', 'new']);
			expect(db.state()!.revision).toBe(1);
		}
	});

	it('enforces the stored-warning cap under concurrent additions', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: Array.from({ length: 49 }, (_, i) => warning(`old-${i}`)) }] }));
		const warns = new Warn(guild, db.prisma);
		const results = await Promise.all([add(warns, 'one'), add(warns, 'two')]);
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(db.state()!.warnlist[0].warns).toHaveLength(50);
	});

	it('does not restore removed warnings when an addition races a removal', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: [warning('old')] }] }));
		const warns = new Warn(guild, db.prisma);
		await Promise.all([warns.remove('old', member), add(warns, 'new')]);
		expect(db.state()!.warnlist[0].warns.map((entry) => entry.id)).toEqual(['new']);
	});

	it('reports exactly one success when two moderators remove the same warning', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: [warning('old')] }] }));
		const warns = new Warn(guild, db.prisma);
		const removed = await Promise.all([warns.remove('old', member), warns.remove('old', member)]);
		expect(removed.filter(Boolean)).toHaveLength(1);
		expect(db.state()!.warnlist[0].warns).toEqual([]);
	});

	it('rejects duplicate warning IDs without adding another entry', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: [warning('old')] }] }));
		await expect(add(new Warn(guild, db.prisma), 'old')).rejects.toThrow('already exists');
		expect(db.writes()).toBe(0);
	});

	it('preserves a reason edit when a warning is added concurrently', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: [warning('old')] }] }));
		const warns = new Warn(guild, db.prisma);
		await Promise.all([warns.updateReason(member.id, 'old', 'corrected'), add(warns, 'new')]);
		expect(db.state()!.warnlist[0].warns.map((entry) => [entry.id, entry.reason])).toEqual([
			['old', 'corrected'],
			['new', 'reason']
		]);
		expect(await warns.updateReason(member.id, 'missing', 'ignored')).toBeNull();
	});

	it('sends mapped IDs and Extended JSON dates in the atomic native write', async () => {
		const db = database(document());
		await add(new Warn(guild, db.prisma), 'one');
		expect(db.conditions[0]).toMatchObject({
			update: 'guildWarns',
			updates: [
				{
					q: { _id: guild.id, $or: [{ revision: 0 }, { revision: null }] },
					u: {
						$set: {
							warnlist: [
								{
									_id: member.id,
									warns: [{ _id: 'one', date: { $date: expect.any(String) }, expiration: { $date: expect.any(String) } }]
								}
							],
							revision: 1
						}
					},
					upsert: false,
					multi: false
				}
			]
		});
	});

	it('returns severity snapshots that cross a threshold only once for concurrent warnings', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: [warning('old', undefined, 2)] }] }));
		const warns = new Warn(guild, db.prisma);
		const results = await Promise.all([add(warns, 'one'), add(warns, 'two')]);
		expect(results.filter((result) => result!.previousSeverity < 3 && result!.severity >= 3)).toHaveLength(1);
		expect(results.map((result) => [result!.previousSeverity, result!.severity]).sort()).toEqual([
			[2, 3],
			[3, 4]
		]);
	});

	it('excludes expired warnings from severity and uses a single cutoff for active and inactive lists', async () => {
		const db = database(document({ warnlist: [{ id: member.id, warns: [warning('expired', new Date(0), 5), warning('active')] }] }));
		const warns = new Warn(guild, db.prisma);
		const added = await add(warns, 'new');
		expect(added!.previousSeverity).toBe(1);
		expect(added!.severity).toBe(2);
		const refined = await warns.getRefined(member);
		expect(refined!.active.map((entry) => entry.id)).toEqual(['active', 'new']);
		expect(refined!.inactive.map((entry) => entry.id)).toEqual(['expired']);
	});

	it('keeps one action per severity when two administrators create it simultaneously', async () => {
		const db = database(document());
		const warns = new Warn(guild, db.prisma);
		const results = await Promise.all([warns.addAction({ action: 'kick', severity: 5 }), warns.addAction({ action: 'ban', severity: 5 })]);
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(results).toContain(null);
		expect(db.state()!.actions).toHaveLength(1);
	});

	it('enforces the action cap under concurrent additions', async () => {
		const db = database(document({ actions: Array.from({ length: 9 }, (_, i) => ({ action: 'kick', severity: i + 1, expiration: null })) }));
		const warns = new Warn(guild, db.prisma);
		const results = await Promise.all([warns.addAction({ action: 'kick', severity: 10 }), warns.addAction({ action: 'ban', severity: 11 })]);
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(db.state()!.actions).toHaveLength(10);
	});

	it('preserves warning additions when an action is removed concurrently', async () => {
		const db = database(document({ actions: [{ action: 'kick', severity: 5, expiration: null }] }));
		const warns = new Warn(guild, db.prisma);
		const [removed] = await Promise.all([warns.removeAction(5), add(warns, 'one')]);
		expect(removed!.severity).toBe(5);
		expect(db.state()!.actions).toEqual([]);
		expect(db.state()!.warnlist[0].warns[0].id).toBe('one');
	});

	it('fails closed on native write errors instead of reporting a warning as saved', async () => {
		for (const response of [{ ok: 1, n: 0, writeErrors: [{ code: 121 }] }, { ok: 1, n: 1, writeConcernError: { code: 64 } }, { ok: 1 }]) {
			const db = database(document());
			db.prisma.$runCommandRaw = async () => response;
			await expect(add(new Warn(guild, db.prisma), 'one')).rejects.toThrow();
			expect(db.reads()).toBe(1);
		}
	});

	it('does not swallow unrelated database errors', async () => {
		const db = database();
		db.store.create = async () => {
			throw new Error('Database unavailable');
		};
		await expect(add(new Warn(guild, db.prisma), 'one')).rejects.toThrow('Database unavailable');
	});
});
