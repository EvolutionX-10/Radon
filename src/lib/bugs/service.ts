import type { PrismaClient } from '@prisma/client';

export const BUG_COOLDOWN_MS = 10 * 60_000;
export const BUG_WARNING =
	'Spam, false reports, harassment, or other misuse will lead to a ban from using Radon. Never include passwords, tokens, or private account codes.';
export const BUG_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];
export type BugInput = { id: string; reporterId: string; guildId: string; channelId: string; summary: string; details: string };

export class BugReportError extends Error {
	public constructor(
		public readonly kind: 'invalid' | 'banned' | 'cooldown' | 'owner',
		message: string
	) {
		super(message);
	}
}

export function requireBugOwner(actorId: string, owners: readonly string[]) {
	if (!owners.includes(actorId)) throw new BugReportError('owner', 'Only the bot owner can review bug reports.');
}

export function cleanBugText(value: string, name: string, min: number, max: number) {
	const normalized = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
	if (normalized.length < min || normalized.length > max) throw new BugReportError('invalid', `${name} must contain ${min}–${max} characters.`);
	return normalized;
}

export class BugReports {
	public constructor(
		private readonly prisma: PrismaClient,
		private readonly owners: readonly string[]
	) {}

	/** The report and cooldown commit together, including under concurrent shard submissions. */
	public async submit(input: BugInput, now = new Date()) {
		const data = {
			...input,
			summary: cleanBugText(input.summary, 'Summary', 10, 120),
			details: cleanBugText(input.details, 'Details', 30, 1800),
			createdAt: now
		};
		for (let attempt = 0; ; attempt++) {
			try {
				return await this.prisma.$transaction(async (tx) => {
					// Discord interaction IDs make retries after a lost acknowledgement idempotent.
					const existing = await tx.bugReport.findUnique({ where: { id: input.id } });
					if (existing) {
						if (existing.reporterId !== input.reporterId) throw new BugReportError('invalid', 'Invalid report reference.');
						return { report: existing, created: false };
					}
					const reporter = await tx.bugReporter.upsert({
						where: { id: input.reporterId },
						create: { id: input.reporterId, nextReportAt: new Date(0) },
						update: {}
					});
					if (reporter.banned) throw new BugReportError('banned', 'You are banned from using Radon.');
					if (reporter.nextReportAt > now)
						throw new BugReportError(
							'cooldown',
							`Please wait until <t:${Math.ceil(reporter.nextReportAt.getTime() / 1000)}:R> before reporting another bug.`
						);
					await tx.bugReporter.update({
						where: { id: input.reporterId },
						data: { nextReportAt: new Date(now.getTime() + BUG_COOLDOWN_MS) }
					});
					return { report: await tx.bugReport.create({ data }), created: true };
				});
			} catch (error) {
				const code = (error as { code?: string }).code;
				if (attempt >= 4 || (code !== 'P2034' && code !== 'P2002')) throw error;
			}
		}
	}

	public async list(actorId: string, status: BugStatus, before?: string) {
		requireBugOwner(actorId, this.owners);
		if (!BUG_STATUSES.includes(status)) throw new BugReportError('invalid', 'Invalid report status.');
		const cursor = before ? await this.prisma.bugReport.findUnique({ where: { id: before } }) : null;
		if (before && !cursor) throw new BugReportError('invalid', 'Page reference not found.');
		const records = await this.prisma.bugReport.findMany({
			where: {
				status,
				...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {})
			},
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: 6
		});
		return { reports: records.slice(0, 5), next: records.length > 5 ? records[4].id : null };
	}

	public view(actorId: string, id: string) {
		requireBugOwner(actorId, this.owners);
		return this.prisma.bugReport.findUnique({ where: { id } });
	}

	public review(actorId: string, id: string, status: BugStatus, note: string) {
		requireBugOwner(actorId, this.owners);
		if (!BUG_STATUSES.includes(status)) throw new BugReportError('invalid', 'Invalid report status.');
		return this.prisma.bugReport.updateMany({
			where: { id },
			data: { status, reviewNote: cleanBugText(note, 'Review note', 1, 500), reviewerId: actorId, reviewedAt: new Date() }
		});
	}

	public setBan(actorId: string, userId: string, banned: boolean, reason: string) {
		requireBugOwner(actorId, this.owners);
		if (this.owners.includes(userId)) throw new BugReportError('invalid', 'Bot owners cannot be banned.');
		const data = { banned, bannedBy: actorId, banReason: cleanBugText(reason, 'Reason', 1, 500) };
		return this.prisma.bugReporter.upsert({
			where: { id: userId },
			create: { id: userId, nextReportAt: new Date(0), ...data },
			update: data
		});
	}
}
