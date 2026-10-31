import { displayText } from './fixtures/presentation.js';
import { describe, expect, it, spyOn } from 'bun:test';
import { ModerationAction } from '../src/lib/structures/classes/ModerationAction.js';
import { UserHandler } from '../src/interaction-handlers/buttons/reviewReport.js';

function fixture(options: { staff?: boolean; targetPosition?: number; bot?: boolean; validMessage?: boolean } = {}) {
	const replies: string[] = [];
	let fetchedTarget = false;
	let timeouts = 0;
	let claims = 0;
	let queries = 0;
	const moderator = {
		id: 'mod',
		guild: { id: 'guild', ownerId: 'owner' },
		roles: { highest: { comparePositionTo: () => 5 - (options.targetPosition ?? 1) }, cache: { some: () => options.staff ?? true } },
		permissions: { has: () => false }
	};
	const target = {
		id: 'target',
		user: { bot: options.bot ?? false },
		roles: { highest: { position: options.targetPosition ?? 1 } },
		disableCommunicationUntil: async () => {
			timeouts++;
		}
	};
	const prisma = {
		guildSettings: { findUnique: async () => ({ adminRoles: [], modRoles: ['modrole'] }) },
		moderationReport: {
			findFirst: async () => {
				queries++;
				return {
					id: 'report',
					targetId: 'target',
					reviewMessageId: options.validMessage === false ? 'other' : 'review',
					messageUrl: 'https://discord.com/channels/g/c/m'
				};
			}
		},
		$runCommandRaw: async () => {
			claims++;
			return { ok: 1, value: { _id: 'report' } };
		}
	};
	const interaction = {
		guildId: 'guild',
		user: { id: 'mod' },
		client: { user: { id: 'bot' }, emit: () => true },
		guild: {
			id: 'guild',
			ownerId: 'owner',
			members: {
				fetch: async (q: any) => {
					expect(q.force).toBe(true);
					if (q.user === 'mod') return moderator;
					fetchedTarget = true;
					return target;
				}
			}
		},
		message: { id: 'review', author: { id: 'bot' }, edit: async () => null },
		deferReply: async () => null,
		editReply: async (text: string) => {
			replies.push(text);
		}
	};
	const handler = { container: { prisma, logger: { error: () => null } } };
	return {
		handler,
		interaction,
		replies,
		timeouts: () => timeouts,
		claims: () => claims,
		queries: () => queries,
		fetchedTarget: () => fetchedTarget
	};
}

describe('report button authorization and hierarchy', () => {
	it('denies an unconfigured role before reading or claiming a report', async () => {
		const f = fixture({ staff: false });
		await UserHandler.prototype.run.call(f.handler as any, f.interaction as any, { action: 'timeout', id: 'report' });
		expect(displayText(f.replies[0])).toContain('Only configured moderation staff');
		expect(f.queries()).toBe(0);
		expect(f.claims()).toBe(0);
	});
	it('rejects a message not bound to the stored report', async () => {
		const f = fixture({ validMessage: false });
		await UserHandler.prototype.run.call(f.handler as any, f.interaction as any, { action: 'dismiss', id: 'report' });
		expect(displayText(f.replies[0])).toContain('no longer valid');
		expect(f.claims()).toBe(0);
	});
	it('rejects above-ranked members before invoking even the old moderation implementation', async () => {
		const f = fixture({ targetPosition: 10 });
		await UserHandler.prototype.run.call(f.handler as any, f.interaction as any, { action: 'timeout', id: 'report' });
		expect(f.fetchedTarget()).toBe(true);
		expect(f.timeouts()).toBe(0);
		expect(displayText(f.replies[0])).toContain('action failed');
	});
	it('rejects timeout on bots', async () => {
		const f = fixture({ bot: true });
		await UserHandler.prototype.run.call(f.handler as any, f.interaction as any, { action: 'timeout', id: 'report' });
		expect(f.timeouts()).toBe(0);
		expect(displayText(f.replies[0])).toContain('action failed');
	});
	it('lets configured staff dismiss a valid report without targeting a member', async () => {
		const f = fixture();
		await UserHandler.prototype.run.call(f.handler as any, f.interaction as any, { action: 'dismiss', id: 'report' });
		expect(f.fetchedTarget()).toBe(false);
		expect(f.claims()).toBe(2);
		expect(displayText(f.replies[0])).toContain('Report dismissed.');
	});
	it('keeps a timeout review claimed after a network error of unknown outcome', async () => {
		const f = fixture();
		const invoke = spyOn(ModerationAction.prototype, 'invoke').mockRejectedValue(new Error('Network timeout'));
		try {
			await UserHandler.prototype.run.call(f.handler as any, f.interaction as any, { action: 'timeout', id: 'report' });
			expect(f.claims()).toBe(1);
			expect(displayText(f.replies[0])).toContain('outcome could not be confirmed');
			expect(displayText(f.replies[0])).toContain('remains in review');
		} finally {
			invoke.mockRestore();
		}
	});
});
