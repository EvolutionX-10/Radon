import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { ModerationReports, reportId } from '../src/lib/moderation/reports.js';
import { atomicUpdate } from '../src/lib/moderation/atomicUpdate.js';

const input = {
	guildId: 'g',
	channelId: 'c',
	messageId: 'm',
	targetId: 't',
	reporterId: 'r',
	messageUrl: 'https://discord.com/channels/g/c/m',
	excerpt: 'text'
};

describe('private report storage and reviews', () => {
	it('deduplicates by guild, message, and reporter while allowing independent reporters', () => {
		expect(reportId(input)).toBe(reportId({ ...input }));
		expect(reportId(input)).not.toBe(reportId({ ...input, reporterId: 'other' }));
		expect(reportId(input)).not.toBe(reportId({ ...input, guildId: 'other' }));
	});
	it('returns the existing report after a unique collision', async () => {
		const reports = new ModerationReports({
			moderationReport: {
				create: async () => {
					throw Object.assign(new Error('Duplicate'), { code: 'P2002' });
				},
				findUniqueOrThrow: async () => ({ id: reportId(input), ...input })
			}
		} as unknown as PrismaClient);
		expect((await reports.submit(input)).created).toBe(false);
	});
	it('uses one native conditional write so only one moderator can claim a report', async () => {
		let pending = true;
		const commands: any[] = [];
		const prisma = {
			$runCommandRaw: async (q: any) => {
				commands.push(q);
				if (!pending) return { ok: 1, value: null };
				pending = false;
				return { ok: 1, value: { _id: 'report' } };
			}
		} as unknown as PrismaClient;
		const reports = new ModerationReports(prisma);
		const results = await Promise.all([reports.claim('g', 'report', 'mod1', 'timeout'), reports.claim('g', 'report', 'mod2', 'dismiss')]);
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(commands[0]).toMatchObject({ findAndModify: 'moderationReport', query: { _id: 'report', guildId: 'g', status: 'pending' } });
	});
	it('does not mark an outcome complete after losing the claim', async () => {
		let command: any;
		const reports = new ModerationReports({
			$runCommandRaw: async (q: any) => {
				command = q;
				return { ok: 1, value: null };
			}
		} as unknown as PrismaClient);
		expect(await reports.finish('g', 'report', 'mod', 'actioned')).toBe(false);
		expect(command.query).toEqual({ _id: 'report', guildId: 'g', status: 'reviewing', reviewerId: 'mod' });
	});
	it('rejects write-concern uncertainty rather than treating it as a safe conflict', async () => {
		const prisma = {
			$runCommandRaw: async () => ({ ok: 1, value: { _id: 'case' }, writeConcernError: { code: 64 } })
		} as unknown as PrismaClient;
		await expect(atomicUpdate(prisma, 'moderationCase', { _id: 'case' }, { $set: { reason: 'new' } })).rejects.toThrow('did not confirm');
	});
});
