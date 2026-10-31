import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { ModerationCases } from '../src/lib/moderation/cases.js';
import { isModerationStaff } from '../src/lib/moderation/authorization.js';
import type { BaseModActionData } from '../src/lib/types/Data.js';
import type { GuildMember } from 'discord.js';

describe('moderation case persistence', () => {
	it('records outcomes with guild scope and without depending on a log channel', async () => {
		let saved: any;
		const service = new ModerationCases({ moderationCase: { create: async (q: any) => (saved = q.data) } } as unknown as PrismaClient);
		await service.record({
			moderator: { id: 'mod', guild: { id: 'guild' } },
			target: { id: 'target' },
			action: 'ban',
			reason: 'spam'
		} as BaseModActionData);
		expect(saved).toMatchObject({
			guildId: 'guild',
			actorId: 'mod',
			targetId: 'target',
			action: 'ban',
			reason: 'spam',
			notes: [],
			reasonEdits: []
		});
		expect(saved.id).toHaveLength(36);
	});
	it('retries a concurrent reason edit using the latest previous reason', async () => {
		const writes: any[] = [];
		let reads = 0;
		const service = new ModerationCases({
			moderationCase: { findFirst: async () => ({ reason: reads++ === 0 ? 'original' : 'other moderator' }) },
			$runCommandRaw: async (q: any) => {
				writes.push(q);
				return { ok: 1, value: writes.length === 1 ? null : { _id: 'case' } };
			}
		} as unknown as PrismaClient);
		expect(await service.editReason('guild', 'case', 'mod', 'new reason')).toBe(true);
		expect(writes[1].query).toEqual({ _id: 'case', guildId: 'guild', reason: 'other moderator' });
		expect(writes[1].update.$push.reasonEdits).toMatchObject({ actorId: 'mod', previous: 'other moderator', reason: 'new reason' });
	});
	it('does not update cases from a different guild', async () => {
		let written = false;
		const service = new ModerationCases({
			moderationCase: {
				findFirst: async (q: any) => {
					expect(q.where).toEqual({ id: 'foreign', guildId: 'guild' });
					return null;
				},
				updateMany: async () => {
					written = true;
				}
			}
		} as unknown as PrismaClient);
		expect(await service.editReason('guild', 'foreign', 'mod', 'reason')).toBe(false);
		expect(written).toBe(false);
	});
	it('uses a stable history cursor even when records share a timestamp', async () => {
		const createdAt = new Date('2026-10-31T12:00:00Z');
		let query: any;
		const service = new ModerationCases({
			moderationCase: {
				findFirst: async () => ({ id: 'cursor', guildId: 'guild', targetId: 'target', createdAt }),
				findMany: async (q: any) => {
					query = q;
					return [];
				}
			}
		} as unknown as PrismaClient);
		await service.history('guild', 'target', 'cursor');
		expect(query.where.OR).toEqual([{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: 'cursor' } }]);
		expect(query.take).toBe(10);
	});
});

describe('component moderation authorization', () => {
	const prisma = { guildSettings: { findUnique: async () => ({ adminRoles: ['admin-id'], modRoles: ['mod-id'] }) } } as unknown as PrismaClient;
	function member(ids: string[]) {
		return {
			id: 'user',
			guild: { id: 'guild', ownerId: 'owner' },
			permissions: { has: () => false },
			roles: { cache: { some: (p: any) => ids.some((id) => p({ id, name: 'moderator' })) } }
		} as unknown as GuildMember;
	}
	it('allows configured role IDs and rejects a role named moderator', async () => {
		expect(await isModerationStaff(member(['mod-id']), prisma)).toBe(true);
		expect(await isModerationStaff(member(['unconfigured']), prisma)).toBe(false);
	});
});
