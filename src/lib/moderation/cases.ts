import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { BaseModActionData } from '#lib/types';
import { atomicUpdate, mongoDate } from './atomicUpdate.js';

export class ModerationCases {
	public constructor(private readonly prisma: PrismaClient) {}

	public record(data: BaseModActionData) {
		return this.prisma.moderationCase.create({
			data: {
				id: randomUUID(),
				guildId: data.moderator.guild.id,
				actorId: data.moderator.id,
				targetId: data.target.id,
				action: data.action,
				reason: data.reason ?? '',
				notes: [],
				reasonEdits: [],
				sourceUrl: data.url
			}
		});
	}

	public get(guildId: string, id: string) {
		return this.prisma.moderationCase.findFirst({ where: { id, guildId } });
	}

	public async history(guildId: string, targetId: string, beforeId?: string) {
		const before = beforeId ? await this.get(guildId, beforeId) : null;
		if (beforeId && (!before || before.targetId !== targetId)) return [];
		return this.prisma.moderationCase.findMany({
			where: {
				guildId,
				targetId,
				...(before ? { OR: [{ createdAt: { lt: before.createdAt } }, { createdAt: before.createdAt, id: { lt: before.id } }] } : {})
			},
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: 10
		});
	}

	public async addNote(guildId: string, id: string, actorId: string, text: string) {
		return this.prisma.moderationCase.updateMany({
			where: { id, guildId },
			data: { notes: { push: { actorId, text, createdAt: new Date() } } }
		});
	}

	/** Compare-and-swap keeps the audit trail accurate if two moderators edit together. */
	public async editReason(guildId: string, id: string, actorId: string, reason: string) {
		for (let attempt = 0; attempt < 5; attempt++) {
			const record = await this.get(guildId, id);
			if (!record) return false;
			const changed = await atomicUpdate(
				this.prisma,
				'moderationCase',
				{ _id: id, guildId, reason: record.reason },
				{
					$set: { reason },
					$push: { reasonEdits: { actorId, previous: record.reason, reason, createdAt: mongoDate(new Date()) } }
				}
			);
			if (changed) return true;
		}
		throw new Error('Case changed repeatedly. Please try again.');
	}
}
