import { describe, expect, it, mock } from 'bun:test';
import { ChannelType, Collection, GuildChannel, MessageFlags, PermissionsBitField } from 'discord.js';
import { beginLockPrompt, completeLockPrompt, getLockTargets } from '#lib/locks/interaction.js';
import { lockSessions, type LockScope } from '#lib/locks/sessions.js';
import { displayText } from './fixtures/presentation.js';

function fixture(scope: LockScope = 'server', action: 'lock' | 'unlock' = 'lock') {
	const records = new Map<string, any>();
	const member = {
		id: 'moderator',
		permissions: new PermissionsBitField(),
		roles: { cache: new Collection([['admin-role', { id: 'admin-role' }]]) }
	};
	const role = {
		id: 'guild',
		managed: false,
		editable: true,
		permissions: new PermissionsBitField(['SendMessages', 'Speak', 'ViewChannel']),
		setPermissions: mock(async (bits: bigint) => {
			role.permissions = new PermissionsBitField(bits);
		})
	};
	const bot = { permissions: new PermissionsBitField(['ManageRoles']) };
	const guild = {
		id: 'guild',
		ownerId: 'server-owner',
		roles: { everyone: role, fetch: mock(async () => role) },
		members: { me: bot, fetch: mock(async () => member), fetchMe: mock(async () => bot) },
		channels: { fetch: mock(async () => new Collection()) }
	};
	const prisma = {
		guildSettings: { findUnique: mock(async () => ({ adminRoles: ['admin-role'], modRoles: ['mod-role'] })) },
		channelLockSnapshot: {
			findUnique: mock(async ({ where }: any) => records.get(where.id) ?? null),
			create: mock(async ({ data }: any) => {
				records.set(data.id, data);
				return data;
			})
		},
		$runCommandRaw: mock(async () => ({ ok: 1, value: {}, n: 1 }))
	};
	const token = lockSessions.create({
		userId: member.id,
		guildId: guild.id,
		action,
		scope,
		roleId: role.id,
		channelId: 'channel',
		threads: false,
		deep: false
	});
	const interaction = {
		user: { id: member.id, tag: 'Test moderator' },
		guildId: guild.id,
		guild,
		customId: `radon-lock:${action}:${token}`,
		inCachedGuild: () => true,
		fields: {
			fields: new Map([['duration', {}]]),
			getTextInputValue: (name: string) => (name === 'duration' ? '10m' : '  Review pending  ')
		},
		deferReply: mock(async (_payload: any) => {}),
		editReply: mock(async (_payload: any) => {}),
		reply: mock(async (_payload: any) => {}),
		showModal: mock(async (_payload: any) => {}),
		options: { getRole: () => role, getChannel: () => ({ id: 'channel' }), getBoolean: () => false }
	};
	return { member, role, bot, guild, prisma, records, token, interaction };
}

describe('lock prompt authorization and recovery', () => {
	it('opens a bounded form and binds its session to the submitting user and server', async () => {
		const f = fixture('text');
		await beginLockPrompt(f.interaction as any, 'lock', 'text');
		const modal = f.interaction.showModal.mock.calls[0][0].toJSON();
		expect(modal.custom_id.length).toBeLessThanOrEqual(100);
		expect(modal.components).toHaveLength(2);
		const token = modal.custom_id.split(':')[2];
		expect(lockSessions.consume(token, 'other-user', f.guild.id)).toBeNull();
		expect(lockSessions.consume(token, f.member.id, f.guild.id)).toMatchObject({
			scope: 'text',
			roleId: f.role.id,
			channelId: 'channel'
		});
	});
	it('rejects managed roles before opening a form and omits duration when restoring', async () => {
		const f = fixture();
		f.role.managed = true;
		await beginLockPrompt(f.interaction as any, 'lock', 'server');
		expect(f.interaction.showModal).not.toHaveBeenCalled();
		expect(f.interaction.reply.mock.calls[0][0].flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
		f.role.managed = false;
		await beginLockPrompt(f.interaction as any, 'unlock', 'server');
		expect(f.interaction.showModal.mock.calls[0][0].toJSON().components).toHaveLength(1);
	});
	it('keeps failures private when the interaction is outside a cached server', async () => {
		const f = fixture();
		f.interaction.inCachedGuild = () => false;
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(f.interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
		expect(displayText(f.interaction.editReply.mock.calls[0][0])).toContain('requires a server');
		expect(f.guild.members.fetch).not.toHaveBeenCalled();
	});
	it('rejects a copied form without consuming its rightful owner’s prompt', async () => {
		const f = fixture();
		f.interaction.user.id = 'another-user';
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(displayText(f.interaction.editReply.mock.calls[0][0])).toContain('belongs to another session');
		expect(lockSessions.consume(f.token, f.member.id, f.guild.id)).not.toBeNull();
		expect(f.prisma.channelLockSnapshot.create).not.toHaveBeenCalled();
	});
	it('rechecks permissions at submission after staff roles have been removed', async () => {
		const f = fixture();
		f.member.roles.cache.clear();
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(f.guild.members.fetch).toHaveBeenCalledWith({ user: f.member.id, force: true });
		expect(displayText(f.interaction.editReply.mock.calls[0][0])).toContain('no longer have administrator access');
		expect(f.role.setPermissions).not.toHaveBeenCalled();
		expect(f.prisma.channelLockSnapshot.create).not.toHaveBeenCalled();
	});
	it('permits a configured moderator for a channel but refuses a server-wide lock', async () => {
		for (const scope of ['text', 'server'] as const) {
			const f = fixture(scope);
			f.member.roles.cache = new Collection([['mod-role', { id: 'mod-role' }]]);
			await completeLockPrompt(f.interaction as any, f.prisma as any);
			const output = displayText(f.interaction.editReply.mock.calls.at(-1)?.[0]);
			expect(output.includes('no longer have administrator access')).toBe(scope === 'server');
			expect(f.guild.members.fetchMe.mock.calls.length).toBe(scope === 'text' ? 1 : 0);
		}
	});
	it('refuses the action if bot permissions or the selected role changed after the prompt', async () => {
		for (const failure of ['bot', 'role'] as const) {
			const f = fixture();
			if (failure === 'bot') f.bot.permissions = new PermissionsBitField();
			else f.role.managed = true;
			await completeLockPrompt(f.interaction as any, f.prisma as any);
			const output = displayText(f.interaction.editReply.mock.calls.at(-1)?.[0]);
			expect(output).toContain(failure === 'bot' ? 'need Manage Roles' : 'selected role is missing, managed');
			expect(f.role.setPermissions).not.toHaveBeenCalled();
		}
	});
	it('saves the original permissions and expiry before applying a temporary server lock', async () => {
		const f = fixture();
		f.role.setPermissions.mockImplementation(async (bits) => {
			expect(f.records.size).toBe(1);
			f.role.permissions = new PermissionsBitField(bits);
		});
		const started = Date.now();
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		const saved = [...f.records.values()][0];
		expect(JSON.parse(saved.snapshot).bits).not.toBe('0');
		expect(saved.expiresAt.getTime()).toBeGreaterThanOrEqual(started + 600_000);
		expect(f.role.permissions.has('SendMessages')).toBe(false);
		expect(f.role.permissions.has('ViewChannel')).toBe(true);
		expect(f.role.setPermissions.mock.calls[0][1]).toContain('Review pending');
		const reply = f.interaction.editReply.mock.calls.at(-1)![0];
		expect(displayText(reply)).toContain('Locked **1**');
		expect(displayText(reply)).toContain('Automatic restoration scheduled');
		expect(reply.allowedMentions).toEqual({ parse: [] });
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(f.role.setPermissions).toHaveBeenCalledTimes(1);
		expect(displayText(f.interaction.editReply.mock.calls.at(-1)![0])).toContain('expired');
	});
	it('reports old locks without guessing their original permissions', async () => {
		const f = fixture('server', 'unlock');
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(displayText(f.interaction.editReply.mock.calls.at(-1)![0])).toContain('no saved lock');
		expect(f.role.setPermissions).not.toHaveBeenCalled();
		expect(f.records.size).toBe(0);
	});
	it('retains recovery data after a Discord failure and never confirms the failed target', async () => {
		const f = fixture();
		f.role.setPermissions.mockImplementation(async () => {
			throw new Error('Discord unavailable');
		});
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(f.records.size).toBe(1);
		const output = displayText(f.interaction.editReply.mock.calls.at(-1)![0]);
		expect(output).toContain('Locked **0**');
		expect(output).toContain('failed **1**');
		expect(output).toContain('recovery snapshot');
	});
	it('rejects invalid durations without saving a snapshot or changing permissions', async () => {
		const f = fixture();
		f.interaction.fields.getTextInputValue = (name) => (name === 'duration' ? 'forever please' : 'Reason');
		await completeLockPrompt(f.interaction as any, f.prisma as any);
		expect(displayText(f.interaction.editReply.mock.calls.at(-1)![0])).toContain('Lock operation failed');
		expect(f.records.size).toBe(0);
		expect(f.role.setPermissions).not.toHaveBeenCalled();
	});
});

describe('lock target scope', () => {
	it('limits bulk operations to their requested channel types and category', async () => {
		const f = fixture();
		const channel = (id: string, type: ChannelType, parentId = 'category') =>
			Object.assign(Object.create(GuildChannel.prototype), { id, type, parentId, isVoiceBased: () => type === ChannelType.GuildVoice });
		const channels = new Collection([
			['text', channel('text', ChannelType.GuildText)],
			['voice', channel('voice', ChannelType.GuildVoice)],
			['elsewhere', channel('elsewhere', ChannelType.GuildText, 'other-category')],
			['category', channel('category', ChannelType.GuildCategory)],
			['thread', channel('thread', ChannelType.PublicThread)],
			['missing', null]
		]);
		f.guild.channels.fetch.mockResolvedValue(channels as any);
		const session = {
			userId: f.member.id,
			guildId: f.guild.id,
			action: 'lock' as const,
			scope: 'category' as LockScope,
			roleId: f.role.id,
			channelId: 'category',
			threads: false,
			deep: false
		};
		const targets = async (scope: LockScope) => getLockTargets(f.guild as any, { ...session, scope });
		expect((await targets('category')).map((target) => target.targetId)).toEqual(['text', 'voice']);
		expect((await targets('all text')).map((target) => target.targetId)).toEqual(['text', 'elsewhere']);
		expect((await targets('all voice')).map((target) => target.targetId)).toEqual(['voice']);
		expect((await targets('all thread')).map((target) => target.targetId)).toEqual(['text', 'elsewhere']);
		expect((await getLockTargets(f.guild as any, { ...session, scope: 'server', deep: true })).map((target) => target.targetId)).toEqual([
			'text',
			'voice',
			'elsewhere'
		]);
	});
	it('keeps simple server locks on the role and single-channel operations on their selected target', async () => {
		const f = fixture();
		const session = {
			userId: f.member.id,
			guildId: f.guild.id,
			action: 'lock' as const,
			roleId: f.role.id,
			channelId: 'selected-channel',
			threads: false,
			deep: false
		};
		for (const scope of ['text', 'voice', 'thread', 'server'] as const) {
			const targets = await getLockTargets(f.guild as any, { ...session, scope });
			expect(targets).toHaveLength(1);
			expect(targets[0]).toMatchObject({
				guildId: f.guild.id,
				kind: scope === 'server' ? 'role' : scope === 'thread' ? 'thread' : 'channel',
				targetId: scope === 'server' ? f.role.id : 'selected-channel'
			});
		}
		expect(f.guild.channels.fetch).not.toHaveBeenCalled();
	});
});
