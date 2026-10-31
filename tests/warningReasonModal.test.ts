import { describe, expect, it } from 'bun:test';
import { ModalHandler } from '../src/interaction-handlers/modals/editModlog.js';

function fixture(valid = true) {
	const memberID = '123456789012345678';
	const fields = [
		{ name: 'Moderator', value: '- <@223456789012345678>' },
		{ name: 'Target', value: `- <@${memberID}> \`[${memberID}]\`` },
		{ name: 'Warn ID', value: '- `warn-example`' },
		{ name: 'Severity', value: '- 3' }
	];
	if (!valid) fields.splice(2, 1);
	const data = { title: 'Warn · Case example', description: 'Old reason', fields };
	const warningUpdates: unknown[][] = [];
	const logUpdates: unknown[] = [];
	const replies: string[] = [];
	let memberFetches = 0;
	const actor = { id: 'moderator', guild: { id: 'guild', ownerId: 'moderator' } };
	const interaction = {
		guild: {
			id: 'guild',
			members: {
				fetch: async (query: { user: string; force: boolean }) => {
					memberFetches++;
					if (query.user !== 'moderator') throw new Error('Target has left the server');
					return actor;
				}
			},
			settings: {
				warns: {
					updateReason: async (...args: unknown[]) => {
						warningUpdates.push(args);
						return {};
					}
				}
			}
		},
		user: { id: 'moderator' },
		client: { user: { id: 'bot' } },
		deferReply: async () => undefined,
		editReply: async (text: string) => {
			replies.push(text);
		}
	};
	const message = {
		id: 'log',
		author: { id: 'bot' },
		embeds: [{ ...data, data }],
		edit: async (payload: unknown) => {
			logUpdates.push(payload);
		}
	};
	const result = { channel: { messages: { fetch: async () => message } }, messageId: 'log', reason: 'New reason' };
	const handler = { container: { prisma: { moderationCase: { findFirst: async () => null } } } };
	return { handler, interaction, result, warningUpdates, logUpdates, replies, memberFetches: () => memberFetches };
}

describe('warning reason modal persistence', () => {
	it('updates the stored warning by IDs even if its target has left the server', async () => {
		const f = fixture();
		await ModalHandler.prototype.run.call(f.handler as any, f.interaction as any, f.result as any);
		expect(f.warningUpdates).toEqual([['123456789012345678', 'warn-example', 'New reason']]);
		expect(f.memberFetches()).toBe(1);
		expect(f.logUpdates).toHaveLength(1);
		expect(f.replies[0]).toBe('Reason updated.');
	});
	it('rejects missing warning references without pretending that stored reasons changed', async () => {
		const f = fixture(false);
		await ModalHandler.prototype.run.call(f.handler as any, f.interaction as any, f.result as any);
		expect(f.warningUpdates).toHaveLength(0);
		expect(f.logUpdates).toHaveLength(0);
		expect(f.replies[0]).toContain('missing or invalid');
	});
});
