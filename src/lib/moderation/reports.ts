import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { atomicUpdate, mongoDate } from './atomicUpdate.js';

export interface ReportInput {
	guildId: string;
	channelId: string;
	messageId: string;
	targetId: string;
	reporterId: string;
	messageUrl: string;
	excerpt: string;
}

export function reportId(input: Pick<ReportInput, 'guildId' | 'messageId' | 'reporterId'>) {
	return createHash('sha256').update(`${input.guildId}:${input.messageId}:${input.reporterId}`).digest('hex').slice(0, 32);
}

export class ModerationReports {
	public constructor(private readonly prisma: PrismaClient) {}

	public async submit(input: ReportInput) {
		try {
			return {
				created: true,
				report: await this.prisma.moderationReport.create({ data: { id: reportId(input), ...input, excerpt: input.excerpt.slice(0, 1000) } })
			};
		} catch (error) {
			if ((error as { code?: string }).code !== 'P2002') throw error;
			return { created: false, report: await this.prisma.moderationReport.findUniqueOrThrow({ where: { id: reportId(input) } }) };
		}
	}

	public claim(guildId: string, id: string, reviewerId: string, action: string) {
		return atomicUpdate(
			this.prisma,
			'moderationReport',
			{ _id: id, guildId, status: 'pending' },
			{
				$set: { status: 'reviewing', reviewerId, reviewAction: action }
			}
		);
	}

	public finish(guildId: string, id: string, reviewerId: string, status: 'dismissed' | 'actioned') {
		return atomicUpdate(
			this.prisma,
			'moderationReport',
			{ _id: id, guildId, status: 'reviewing', reviewerId },
			{
				$set: { status, reviewedAt: mongoDate(new Date()) }
			}
		);
	}

	public reset(guildId: string, id: string, reviewerId?: string) {
		return atomicUpdate(
			this.prisma,
			'moderationReport',
			{ _id: id, guildId, status: 'reviewing', ...(reviewerId ? { reviewerId } : {}) },
			{
				$set: { status: 'pending', reviewerId: null, reviewAction: null }
			}
		);
	}
}
