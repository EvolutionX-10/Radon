import { describe, expect, it, mock } from 'bun:test';
import type { automodConfig, PrismaClient } from '@prisma/client';
import { Collection, GuildVerificationLevel, type Guild, type GuildMember, type Message } from 'discord.js';
import { AutoModService } from '../src/lib/automod/service.js';

function config(overrides: Partial<automodConfig> = {}): automodConfig {
	return {
		id: 'guild',
		alertChannelId: 'alerts',
		exemptRoleIds: [],
		exemptChannelIds: [],
		floodMode: 'off',
		floodThreshold: 6,
		duplicateThreshold: 3,
		windowSeconds: 10,
		linkMode: 'off',
		blockedDomains: ['evil.example'],
		allowedDomains: [],
		allowedInviteCodes: [],
		blockInvites: true,
		raidMode: 'off',
		raidThreshold: 3,
		raidWindowSeconds: 10,
		raidDurationSeconds: 600,
		raidRestoreAt: null,
		raidRestoreLevel: null,
		raidLeaseToken: null,
		raidLeaseUntil: null,
		updatedAt: new Date(),
		...overrides
	};
}

function setup(overrides: Partial<automodConfig> = {}) {
	let stored = config(overrides);
	const send = mock(async (_data: unknown) => undefined);
	const setLevel = mock(async (level: number) => {
		guild.verificationLevel = level;
		return guild;
	});
	const guild = {
		id: 'guild',
		ownerId: 'owner',
		verificationLevel: GuildVerificationLevel.Low,
		fetch: mock(async () => guild),
		setVerificationLevel: setLevel,
		channels: { fetch: mock(async () => ({ isTextBased: () => true, isSendable: () => true, send })) }
	};
	const raw = mock(async (command: any) => {
		if (command.findAndModify) {
			if (command.query.raidMode && (stored.raidMode !== 'enforce' || stored.raidRestoreAt !== null)) return { ok: 1, value: null };
			if (command.query.$or && (!stored.raidRestoreAt || (stored.raidLeaseUntil && stored.raidLeaseUntil.getTime() > Date.now())))
				return { ok: 1, value: null };
			const previous = { ...stored };
			for (const [key, value] of Object.entries(command.update.$set))
				(stored as any)[key] = value && typeof value === 'object' && '$date' in value ? new Date((value as any).$date) : value;
			return { ok: 1, value: previous };
		}
		if (command.update) {
			if (
				command.updates[0].q.raidLeaseToken !== stored.raidLeaseToken ||
				(command.updates[0].q.$expr && (!stored.raidLeaseUntil || stored.raidLeaseUntil.getTime() <= Date.now()))
			)
				return { ok: 1, n: 0 };
			for (const [key, value] of Object.entries(command.updates[0].u.$set))
				(stored as any)[key] = value && typeof value === 'object' && '$date' in value ? new Date((value as any).$date) : value;
			return { ok: 1, n: 1 };
		}
		return { ok: 1 };
	});
	const find = mock(async () => ({ ...stored }));
	const prisma = { automodConfig: { findUnique: find }, $runCommandRaw: raw } as unknown as PrismaClient;
	const member = {
		id: 'user',
		user: { bot: false },
		guild,
		permissions: { has: () => false },
		roles: { cache: new Collection() }
	} as unknown as GuildMember;
	const remove = mock(async () => undefined);
	const message = {
		id: 'message',
		inGuild: () => true,
		guild,
		guildId: 'guild',
		channelId: 'channel',
		channel: { isThread: () => false },
		member,
		author: { id: 'user', bot: false },
		webhookId: null,
		partial: false,
		content: 'https://evil.example',
		url: 'https://discord.com/channels/guild/channel/message',
		deletable: true,
		delete: remove
	} as unknown as Message;
	return {
		prisma,
		member,
		message,
		guild,
		send,
		remove,
		raw,
		find,
		setLevel,
		stored: () => stored,
		setStored: (value: automodConfig) => {
			stored = value;
		}
	};
}

describe('AutoMod message processing', () => {
	it('observe mode reports without deleting or copying message content', async () => {
		const f = setup({ linkMode: 'observe' });
		await new AutoModService().message(f.prisma, f.message);
		expect(f.remove).not.toHaveBeenCalled();
		expect(f.send).toHaveBeenCalledTimes(1);
		const payload = f.send.mock.calls[0][0] as { content: string; allowedMentions: { parse: string[] } };
		expect(payload.content).toContain('Observation only');
		expect(payload.content).not.toContain('https://evil.example');
		expect(payload.allowedMentions.parse).toEqual([]);
	});
	it('enforce mode deletes matching messages but rate limits alerts separately', async () => {
		const f = setup({ linkMode: 'enforce' });
		const service = new AutoModService();
		await service.message(f.prisma, f.message);
		await service.message(f.prisma, { ...f.message, id: 'second' } as Message);
		expect(f.remove).toHaveBeenCalledTimes(2);
		expect(f.send).toHaveBeenCalledTimes(1);
		expect((f.send.mock.calls[0][0] as { content: string }).content).toContain('Message deleted');
	});
	it('reports failed deletion accurately', async () => {
		const f = setup({ linkMode: 'enforce' });
		f.remove.mockImplementation(async () => {
			throw new Error('permission lost');
		});
		await new AutoModService().message(f.prisma, f.message);
		expect((f.send.mock.calls[0][0] as { content: string }).content).toContain('Deletion failed');
	});
	it('honors role, channel, parent channel, and staff exemptions', async () => {
		for (const kind of ['channel', 'parent', 'role', 'staff']) {
			const f = setup({ linkMode: 'enforce', exemptChannelIds: ['excluded'], exemptRoleIds: ['staff'] });
			const message = { ...f.message } as any;
			if (kind === 'channel') message.channelId = 'excluded';
			if (kind === 'parent') message.channel = { isThread: () => true, parentId: 'excluded' };
			if (kind === 'role') message.member = { ...f.member, roles: { cache: new Collection([['staff', { id: 'staff' }]]) } };
			if (kind === 'staff') message.member = { ...f.member, permissions: { has: () => true } };
			await new AutoModService().message(f.prisma, message);
			expect(f.remove).not.toHaveBeenCalled();
			expect(f.send).not.toHaveBeenCalled();
		}
	});
	it('ignores bots/webhooks/partial messages and applies links on edits without increasing flood counts', async () => {
		const f = setup({ linkMode: 'enforce', floodMode: 'enforce', floodThreshold: 2 });
		const service = new AutoModService();
		await service.message(f.prisma, { ...f.message, author: { bot: true } } as Message);
		await service.message(f.prisma, { ...f.message, webhookId: 'webhook' } as Message);
		await service.message(f.prisma, { ...f.message, partial: true } as Message);
		expect(f.remove).not.toHaveBeenCalled();
		await service.message(f.prisma, f.message, true);
		expect(f.remove).toHaveBeenCalledTimes(1);
		await service.message(f.prisma, { ...f.message, id: 'clean', content: 'clean' } as Message);
		expect(f.remove).toHaveBeenCalledTimes(1);
	});
	it('deduplicates config reads and invalidates immediately after configuration changes', async () => {
		const f = setup();
		const service = new AutoModService();
		await Promise.all([service.getConfig(f.prisma, 'guild'), service.getConfig(f.prisma, 'guild')]);
		expect(f.find).toHaveBeenCalledTimes(1);
		service.invalidate('guild');
		await service.getConfig(f.prisma, 'guild');
		expect(f.find).toHaveBeenCalledTimes(2);
	});
});

describe('raid restrictions and recovery', () => {
	async function burst(service: AutoModService, f: ReturnType<typeof setup>) {
		await service.join(f.prisma, f.member);
		await service.join(f.prisma, f.member);
		await service.join(f.prisma, f.member);
	}
	it('observation alerts without changing verification or writing a recovery record', async () => {
		const f = setup({ raidMode: 'observe' });
		await burst(new AutoModService(), f);
		expect(f.setLevel).not.toHaveBeenCalled();
		expect(f.raw).not.toHaveBeenCalled();
		expect(f.send).toHaveBeenCalledTimes(1);
	});
	it('persists a conditional recovery record before applying the restriction, and does not extend on further joins', async () => {
		const f = setup({ raidMode: 'enforce' });
		const service = new AutoModService();
		await burst(service, f);
		expect(f.stored().raidRestoreLevel).toBe(GuildVerificationLevel.Low);
		expect(f.stored().raidRestoreAt!.getTime()).toBeGreaterThan(Date.now());
		expect(f.setLevel).toHaveBeenCalledTimes(1);
		expect(f.raw.mock.calls[0][0].query).toMatchObject({ _id: 'guild', raidMode: 'enforce', raidRestoreAt: null });
		await service.join(f.prisma, f.member);
		expect(f.setLevel).toHaveBeenCalledTimes(1);
	});
	it('keeps recovery information after an uncertain Discord response', async () => {
		const f = setup({ raidMode: 'enforce' });
		f.setLevel.mockImplementation(async () => {
			throw new Error('response lost');
		});
		await expect(burst(new AutoModService(), f)).rejects.toThrow('response lost');
		expect(f.stored().raidRestoreAt).not.toBeNull();
		expect(f.stored().raidLeaseUntil!.getTime()).toBeGreaterThan(Date.now());
	});
	it('a new service instance restores after restart with an atomic lease', async () => {
		const f = setup({ raidMode: 'enforce', raidRestoreAt: new Date(Date.now() - 1000), raidRestoreLevel: GuildVerificationLevel.Low });
		f.guild.verificationLevel = GuildVerificationLevel.VeryHigh;
		await new AutoModService().restoreRaid(f.prisma, f.guild as unknown as Guild);
		expect(f.guild.verificationLevel).toBe(GuildVerificationLevel.Low);
		expect(f.stored().raidRestoreAt).toBeNull();
		expect(f.raw.mock.calls[0][0].query.$or).toBeDefined();
		expect(f.raw.mock.calls[1][0].updates[0].q.raidLeaseToken).toBeString();
	});
	it('preserves an intervening administrator change', async () => {
		const f = setup({ raidRestoreAt: new Date(Date.now() - 1000), raidRestoreLevel: GuildVerificationLevel.Low });
		f.guild.verificationLevel = GuildVerificationLevel.Medium;
		await new AutoModService().restoreRaid(f.prisma, f.guild as unknown as Guild);
		expect(f.setLevel).not.toHaveBeenCalled();
		expect(f.stored().raidRestoreAt).toBeNull();
	});
	it('does not compete with another recovery lease and retains pending work on failure', async () => {
		const f = setup({
			raidRestoreAt: new Date(Date.now() - 1000),
			raidRestoreLevel: GuildVerificationLevel.Low,
			raidLeaseUntil: new Date(Date.now() + 60_000)
		});
		f.guild.verificationLevel = GuildVerificationLevel.VeryHigh;
		await new AutoModService().restoreRaid(f.prisma, f.guild as unknown as Guild);
		expect(f.setLevel).not.toHaveBeenCalled();
		f.setStored({ ...f.stored(), raidLeaseUntil: null });
		f.setLevel.mockImplementation(async () => {
			throw new Error('permission lost');
		});
		await expect(new AutoModService().restoreRaid(f.prisma, f.guild as unknown as Guild)).rejects.toThrow();
		expect(f.stored().raidRestoreAt).not.toBeNull();
		expect(f.stored().raidLeaseToken).toBeNull();
	});
});
