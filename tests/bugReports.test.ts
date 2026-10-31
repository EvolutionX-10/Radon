import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { Owners } from '../src/lib/utility/constants.js';
import { BUG_WARNING, BugReports, cleanBugText } from '../src/lib/bugs/service.js';
import { bugInbox, bugReportCard, bugWarning } from '../src/lib/bugs/presentation.js';
import { allowBotInteraction } from '../src/lib/bugs/access.js';
import { UserCommand as BugCommand } from '../src/commands/General/bug.js';
import { UserCommand as BugReportsCommand } from '../src/commands/Core/bugreports.js';
import { ButtonHandler } from '../src/interaction-handlers/buttons/bugReport.js';
import { ModalHandler } from '../src/interaction-handlers/modals/bugReport.js';
import { UserPrecondition as BlacklistPrecondition } from '../src/preconditions/global/Blacklist.js';
import { UserListener as CommandLog } from '../src/listeners/Webhooks/commandRun.js';
import { displayText } from './fixtures/presentation.js';

const reporterId = '123456789012345678';
const record = {
	id: '123456789012345679',
	reporterId,
	guildId: 'guild',
	channelId: 'channel',
	summary: 'A broken command',
	details: 'These steps reproduce the issue. Expected a response, but got an error.',
	status: 'open',
	createdAt: new Date(),
	reviewedAt: null,
	reviewerId: null,
	reviewNote: null
};
afterEach(() => mock.restore());

describe('private bug reporting validation and authorization', () => {
	it('shows a firm abuse warning before opening a user-bound report form', async () => {
		const reply = mock(async () => null);
		await BugCommand.prototype.chatInputRun.call({} as any, { user: { id: reporterId }, reply } as any);
		const payload = reply.mock.calls[0][0];
		expect(displayText(payload)).toContain(BUG_WARNING);
		expect(payload.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
		expect(JSON.stringify(payload)).toContain(`bug:open:${reporterId}`);
	});
	it('validates after trimming/control removal, including maximum input lengths', () => {
		expect(cleanBugText(' \u0000A clear summary\u0007 ', 'Summary', 10, 120)).toBe('A clear summary');
		expect(() => cleanBugText(' '.repeat(40), 'Details', 30, 1800)).toThrow('30–1800');
		expect(() => cleanBugText('a'.repeat(1801), 'Details', 30, 1800)).toThrow('30–1800');
	});
	it('rejects every owner service operation before accessing a database', async () => {
		const service = new BugReports(null as any, ['owner']);
		await expect(service.list('stranger', 'open')).rejects.toMatchObject({ kind: 'owner' });
		expect(() => service.view('stranger', 'secret')).toThrow('Only the bot owner');
		expect(() => service.review('stranger', 'secret', 'resolved', 'note')).toThrow('Only the bot owner');
		expect(() => service.setBan('stranger', reporterId, true, 'reason')).toThrow('Only the bot owner');
	});
	it('rejects banned and rate-limited submissions before creating a report', async () => {
		for (const kind of ['banned', 'cooldown']) {
			const create = mock(async () => record);
			const tx = {
				bugReport: { findUnique: async () => null, create },
				bugReporter: { upsert: async () => ({ banned: kind === 'banned', nextReportAt: new Date(Date.now() + 60_000) }) }
			};
			const service = new BugReports({ $transaction: (callback: any) => callback(tx) } as any, ['owner']);
			await expect(service.submit(record)).rejects.toMatchObject({ kind });
			expect(create).not.toHaveBeenCalled();
		}
	});
	it('retries transaction conflicts but stops after a bounded number of attempts', async () => {
		const transaction = mock(async () => {
			throw { code: 'P2034' };
		});
		await expect(new BugReports({ $transaction: transaction } as any, ['owner']).submit(record)).rejects.toMatchObject({ code: 'P2034' });
		expect(transaction).toHaveBeenCalledTimes(5);
	});
	it('commits once after a transient conflict and does not retry unrelated database errors', async () => {
		const create = mock(async () => record);
		const update = mock(async () => null);
		const tx = {
			bugReport: { findUnique: async () => null, create },
			bugReporter: { upsert: async () => ({ banned: false, nextReportAt: new Date(0) }), update }
		};
		const transaction = mock(async (callback: any) => callback(tx)).mockRejectedValueOnce({ code: 'P2034' });
		const result = await new BugReports({ $transaction: transaction } as any, ['owner']).submit(record);
		expect(result.created).toBe(true);
		expect(transaction).toHaveBeenCalledTimes(2);
		expect(create).toHaveBeenCalledTimes(1);
		expect(update).toHaveBeenCalledTimes(1);
		transaction.mockClear();
		transaction.mockRejectedValue(new Error('Disconnected'));
		await expect(new BugReports({ $transaction: transaction } as any, ['owner']).submit(record)).rejects.toThrow('Disconnected');
		expect(transaction).toHaveBeenCalledTimes(1);
	});
	it('denies direct owner command invocation privately before reading reports', async () => {
		const reply = mock(async () => null);
		await BugReportsCommand.prototype.chatInputRun.call({} as any, { user: { id: reporterId }, reply } as any);
		expect(displayText(reply.mock.calls[0][0])).toContain('Only the bot owner');
		expect(reply.mock.calls[0][0].flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
	});
	it('registers bounded, discoverable user/owner command routes', () => {
		let definition: any;
		BugReportsCommand.prototype.registerApplicationCommands.call(
			{ name: 'bugreports', description: 'Review reports' } as any,
			{
				registerChatInputCommand: (builder: any) => {
					definition = builder(new SlashCommandBuilder()).toJSON();
				}
			} as any
		);
		expect(definition.options.map((option: any) => option.name)).toEqual(['list', 'view', 'review', 'ban', 'unban']);
		expect(
			definition.options.find((option: any) => option.name === 'review').options.find((option: any) => option.name === 'note').max_length
		).toBe(500);
	});
	it('rejects another user opening the form without database calls', async () => {
		const reply = mock(async () => null);
		await ButtonHandler.prototype.run.call({} as any, { user: { id: 'stranger' }, reply } as any, { userId: reporterId });
		expect(displayText(reply.mock.calls[0][0])).toContain('your own private report');
	});
	it('renders a valid modal with input limits and repeated misuse warning', async () => {
		const showModal = mock(async () => null);
		await ButtonHandler.prototype.run.call(
			{ container: { prisma: { bugReporter: { findUnique: async () => null } } } } as any,
			{ user: { id: reporterId }, inGuild: () => true, showModal } as any,
			{ userId: reporterId }
		);
		const modal = showModal.mock.calls[0][0].toJSON();
		expect(modal.title).toContain('Misuse leads to bot ban');
		expect(modal.components[1].components[0].max_length).toBe(1800);
	});
	it('does not copy private bug commands to the general command log', async () => {
		for (const commandName of ['bug', 'bugreports']) await CommandLog.prototype.run.call({} as any, { commandName } as any);
	});
});

describe('bug report notification and rendering', () => {
	function modalSession() {
		const order: string[] = [];
		const send = mock(async () => {
			order.push('notification');
			throw new Error('DMs disabled');
		});
		const editReply = mock(async () => null);
		return {
			order,
			send,
			editReply,
			handler: { container: { prisma: {}, logger: { warn: mock(() => null), error: mock(() => null) } } },
			interaction: {
				id: record.id,
				user: { id: reporterId },
				guildId: 'guild',
				channelId: 'channel',
				deferReply: mock(async () => null),
				editReply,
				fields: { getTextInputValue: (field: string) => (field === 'summary' ? record.summary : record.details) },
				client: { users: { fetch: mock(async () => ({ send })) } }
			}
		};
	}
	it('confirms durable save even when owner DMs fail, with no report body in logs', async () => {
		const session = modalSession();
		spyOn(BugReports.prototype, 'submit').mockImplementation(async () => {
			session.order.push('save');
			return { report: record, created: true };
		});
		await ModalHandler.prototype.run.call(session.handler as any, session.interaction as any, { userId: reporterId });
		expect(session.order).toEqual(['save', 'notification']);
		expect(displayText(session.editReply.mock.calls[0][0])).toContain('was saved');
		expect(JSON.stringify(session.handler.container.logger.warn.mock.calls)).not.toContain(record.details);
		expect(session.interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
	});
	it('does not notify owners when a save fails or when an interaction is replayed', async () => {
		for (const success of [false, true]) {
			const session = modalSession();
			const submit = spyOn(BugReports.prototype, 'submit');
			if (success) submit.mockResolvedValue({ report: record, created: false });
			else submit.mockRejectedValue(new Error('Database failure with private text'));
			await ModalHandler.prototype.run.call(session.handler as any, session.interaction as any, { userId: reporterId });
			expect(session.send).not.toHaveBeenCalled();
			expect(displayText(session.editReply.mock.calls[0][0])).toContain(success ? 'was saved' : 'could not be saved');
			submit.mockRestore();
		}
	});
	it('rejects forged report identity before attempting a save', async () => {
		const session = modalSession();
		const submit = spyOn(BugReports.prototype, 'submit');
		await ModalHandler.prototype.run.call(session.handler as any, session.interaction as any, { userId: 'other' });
		expect(submit).not.toHaveBeenCalled();
	});
	it('bounds malicious Markdown, disables mentions, and retains reviewer information', () => {
		const payload = bugReportCard({
			...record,
			summary: '*'.repeat(120),
			details: '*'.repeat(1800),
			reviewNote: '*'.repeat(500),
			reviewedAt: new Date(),
			reviewerId: Owners[0]
		});
		expect(payload.allowedMentions.parse).toEqual([]);
		expect(displayText(payload).length).toBeLessThan(3800);
		expect(displayText(payload)).toContain('Reviewed');
		expect(displayText(bugInbox([], 'open', null))).toContain('No reports found');
		expect(displayText(bugInbox([record], 'open', record.id))).toContain('Next page:');
	});
});

describe('bot-wide misuse bans', () => {
	it('blocks message, slash and context commands using user bans while preserving guild blacklist checks', async () => {
		const prisma = { bugReporter: { findUnique: mock(async () => ({ banned: true })) }, blacklist: { findUnique: mock(async () => null) } };
		const subject = Object.create(BlacklistPrecondition.prototype);
		Object.defineProperty(subject, 'container', { value: { prisma } });
		subject.ok = () => 'ok';
		subject.error = (error: any) => error;
		for (const [method, input] of [
			['messageRun', { author: { id: reporterId } }],
			['chatInputRun', { user: { id: reporterId } }],
			['contextMenuRun', { user: { id: reporterId } }]
		] as const) {
			expect((await subject[method]({ guildId: 'guild', ...input })).message).toContain('banned');
		}
		expect(prisma.blacklist.findUnique).not.toHaveBeenCalled();
		prisma.bugReporter.findUnique.mockResolvedValue(null as any);
		expect(await subject.chatInputRun({ guildId: 'guild', user: { id: reporterId } })).toBe('ok');
		expect(prisma.blacklist.findUnique).toHaveBeenCalledTimes(1);
	});
	it('suppresses raw collector/handler callbacks for banned users and forwards allowed events once', () => {
		const result = spawnSync(process.execPath, [fileURLToPath(new URL('./fixtures/bugAccess.ts', import.meta.url))], {
			encoding: 'utf8',
			timeout: 10_000
		});
		expect({ status: result.status, error: result.error?.message, stderr: result.stderr }).toEqual({ status: 0, error: undefined, stderr: '' });
	});
	it('rejects autocomplete queries and times out failed access lookups before Discord acknowledgement expires', async () => {
		const respond = mock(async () => null);
		expect(
			await allowBotInteraction(
				{ bugReporter: { findUnique: async () => ({ banned: true }) } } as any,
				{ user: { id: reporterId }, isAutocomplete: () => true, respond } as any
			)
		).toBe(false);
		expect(respond).toHaveBeenCalledWith([]);
		const reply = mock(async () => {
			throw new Error('Expired token');
		});
		expect(
			await allowBotInteraction(
				{ bugReporter: { findUnique: () => new Promise(() => {}) } } as any,
				{ user: { id: reporterId }, isAutocomplete: () => false, isRepliable: () => true, reply } as any,
				5
			)
		).toBe(false);
		expect(reply).toHaveBeenCalledTimes(1);
	});
});
