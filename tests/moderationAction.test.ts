import { describe, expect, it, mock } from 'bun:test';
import type { GuildMember } from 'discord.js';
import { ModerationAction } from '../src/lib/structures/classes/ModerationAction.js';
import { RolesConfig } from '../src/lib/structures/classes/RolesConf.js';
import { Timestamp } from '../src/lib/structures/classes/Timestamp.js';
import { UserListener } from '../src/listeners/Moderation/warnAction.js';
import { RadonEvents } from '../src/lib/types/Events.js';
import { makeExecutor, makeMember, makeUserTarget } from './fixtures/moderation.js';

function fixture(
	prisma = {
		$runCommandRaw: mock(async () => ({ ok: 1, value: null })),
		moderationScheduledBan: { findUnique: mock(async () => null) }
	}
) {
	const moderator = makeExecutor();
	const target = makeMember();
	Object.assign(target, { guild: moderator.guild });
	Object.assign(moderator.guild.members, {
		fetch: mock(async ({ user }: { user: string }) => {
			if (user === moderator.id) return moderator;
			if (user === target.id) return target;
			throw Object.assign(new Error('Unknown member'), { code: 10007 });
		})
	});
	return { moderator, target, service: new ModerationAction(moderator.guild, prisma as never) };
}

describe('shared moderation execution', () => {
	it('refuses a replacement ban before dispatch when its schedule cannot be checked', async () => {
		const prisma = {
			$runCommandRaw: mock(async () => ({ ok: 1, value: null })),
			moderationScheduledBan: {
				findUnique: mock(async () => {
					throw new Error('Schedule storage unavailable');
				})
			}
		};
		const { moderator, target, service } = fixture(prisma);
		await expect(service.invoke({ moderator, target, action: 'ban' })).rejects.toThrow('Schedule storage unavailable');
		expect(moderator.guild.bans.create).not.toHaveBeenCalled();
	});
	it('bans non-members by ID with the requested deletion interval', async () => {
		const { moderator, service } = fixture();
		await service.invoke({ moderator, target: makeUserTarget(), action: 'ban', reason: 'spam' }, { deleteMessageSeconds: 172_800 });
		expect(moderator.guild.bans.create).toHaveBeenCalledWith('user-target', { deleteMessageSeconds: 172_800, reason: 'spam' });
	});

	it('rechecks hierarchy at execution and makes no request on denial', async () => {
		const { moderator, target, service } = fixture();
		Object.assign(target.roles.highest, { position: 11 });
		await expect(service.invoke({ moderator, target, action: 'ban' })).rejects.toThrow('highest role');
		expect(moderator.guild.bans.create).not.toHaveBeenCalled();
	});

	it('resolves a supplied User to current membership before allowing an ID ban', async () => {
		const { moderator, target, service } = fixture();
		Object.assign(target.roles.highest, { position: 20 });
		await expect(service.invoke({ moderator, target: makeUserTarget(target.id), action: 'ban' })).rejects.toThrow('highest role');
		expect(moderator.guild.bans.create).not.toHaveBeenCalled();
	});

	it('blocks a moderator whose access was revoked while confirmation was open', async () => {
		const { moderator, target, service } = fixture();
		moderator.permissions.remove('ManageGuild');
		await expect(service.invoke({ moderator, target, action: 'ban' })).rejects.toThrow('no longer have moderator access');
		expect(moderator.guild.bans.create).not.toHaveBeenCalled();
	});

	it('does not treat a failed member lookup as proof that the user left the server', async () => {
		const { moderator, target, service } = fixture();
		Object.assign(moderator.guild.members, {
			fetch: mock(async ({ user }: { user: string }) => {
				if (user === moderator.id) return moderator;
				throw new Error('network failure');
			})
		});
		await expect(service.invoke({ moderator, target: makeUserTarget(target.id), action: 'ban' })).rejects.toThrow('network failure');
		expect(moderator.guild.bans.create).not.toHaveBeenCalled();
	});

	it('rejects partial softbans instead of reporting success', async () => {
		const { moderator, target, service } = fixture();
		Object.assign(moderator.guild.members, {
			unban: mock(async () => {
				throw new Error('unban denied');
			})
		});
		await expect(service.invoke({ moderator, target, action: 'softban' })).rejects.toThrow('unban denied');
		expect(moderator.guild.bans.create).toHaveBeenCalledTimes(1);
	});

	it('propagates action failures and supports removing a timeout', async () => {
		const { moderator, target, service } = fixture();
		Object.assign(target, {
			kick: mock(async () => {
				throw new Error('Discord unavailable');
			})
		});
		await expect(service.invoke({ moderator, target, action: 'kick' })).rejects.toThrow('Discord unavailable');
		await service.invoke({ moderator, target, action: 'timeout' }, { removeTimeout: true });
		expect(target.disableCommunicationUntil).toHaveBeenCalledWith(null, undefined);
	});

	it('validates durations before issuing requests', async () => {
		const { moderator, target, service } = fixture();
		for (const offset of [-1, 2_419_210_000, Number.NaN]) {
			await expect(service.invoke({ moderator, target, action: 'timeout', duration: new Timestamp(Date.now() + offset) })).rejects.toThrow(
				'duration'
			);
		}
		await expect(service.invoke({ moderator, target, action: 'ban' }, { deleteMessageSeconds: 604_801 })).rejects.toThrow('deletion');
		expect(target.disableCommunicationUntil).not.toHaveBeenCalled();
		expect(moderator.guild.bans.create).not.toHaveBeenCalled();
	});
});

describe('automated action outcomes', () => {
	async function run(fail: boolean) {
		const target = makeMember();
		const bot = makeExecutor({ id: 'bot', highestPosition: 100, permissions: ['BanMembers', 'KickMembers', 'ModerateMembers'] });
		Object.assign(target.guild.members, { me: bot });
		Object.assign(bot, { guild: target.guild });
		Object.assign(target.guild.members, { fetch: mock(async ({ user }: { user: string }) => (user === bot.id ? bot : target)) });
		if (fail)
			Object.assign(target, {
				kick: mock(async () => {
					throw new Error('API denied');
				})
			});
		const emit = mock(() => {});
		const error = mock(() => {});
		const listener = { container: { client: { emit }, logger: { error } } };
		const actions = [
			{ action: 'kick' as const, severity: 2 },
			{ action: 'ban' as const, severity: 5 }
		];
		await UserListener.prototype.run.call(listener as unknown as UserListener, target, 2, actions);
		return { emit, error, actions };
	}
	it('does not emit a successful action when Discord rejects the punishment', async () => {
		const { emit, error } = await run(true);
		expect(emit).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledTimes(1);
	});
	it('emits success without requiring a log channel and does not mutate configured rules', async () => {
		const { emit, error, actions } = await run(false);
		expect(error).not.toHaveBeenCalled();
		expect(emit).toHaveBeenCalledWith(RadonEvents.ModAction, expect.objectContaining({ action: 'kick' }));
		expect(actions.map((action) => action.severity)).toEqual([2, 5]);
	});
});

describe('role settings snapshots', () => {
	it('reads both role lists together and observes the next operation’s revocations', async () => {
		let modRoles = ['staff'];
		const findUnique = mock(async () => ({ adminRoles: ['admin'], modRoles }));
		const roles = new RolesConfig({ id: 'guild' } as GuildMember['guild'], { guildSettings: { findUnique } } as never);
		expect(await roles.snapshot()).toEqual({ admins: ['admin'], mods: ['staff'] });
		expect(findUnique).toHaveBeenCalledTimes(1);
		modRoles = [];
		expect((await roles.snapshot()).mods).toEqual([]);
		expect(findUnique).toHaveBeenCalledTimes(2);
	});
});

describe('temporary-ban dispatch and replacement failure outcomes', () => {
	function dispatchFixture(status: 'preparing' | 'scheduled' | 'cancelled' = 'preparing', failure?: Error) {
		const now = new Date();
		const task = { id: 'guild:target', generation: 'generation', expectedReason: 'marked reason', status, dueAt: now, leaseUntil: null };
		const writes: any[] = [];
		const prisma = {
			moderationScheduledBan: { findUnique: mock(async () => task) },
			$runCommandRaw: mock(async (q: any) => {
				writes.push(q);
				return { ok: 1, value: { _id: task.id } };
			})
		};
		const f = fixture(prisma as never);
		const put = mock(async () => {
			if (failure) throw failure;
		});
		Object.assign(f.moderator.guild, { client: { rest: { put } } });
		Object.assign(f.moderator.guild.bans, { cache: new Map() });
		return { ...f, writes, put };
	}
	it('does not send the ban if its preparation was cancelled before dispatch', async () => {
		const f = dispatchFixture('cancelled');
		await expect(
			f.service.invoke(
				{ moderator: f.moderator, target: f.target, action: 'ban', reason: 'marked reason' },
				{ temporaryBanGeneration: 'generation' }
			)
		).rejects.toThrow('cancelled or replaced');
		expect(f.put).not.toHaveBeenCalled();
		expect(f.writes).toHaveLength(0);
	});
	it('activates a successful temporary ban only under its exact dispatch token', async () => {
		const f = dispatchFixture();
		await f.service.invoke(
			{ moderator: f.moderator, target: f.target, action: 'ban', reason: 'marked reason' },
			{ temporaryBanGeneration: 'generation' }
		);
		expect(f.put).toHaveBeenCalledTimes(1);
		expect(f.writes[1].query.leaseOwner).toBe(f.writes[0].update.$set.leaseOwner);
		expect(f.writes[1].update.$set).toMatchObject({ status: 'scheduled', leaseOwner: null, leaseUntil: null });
	});
	it('does not cancel the original expiry after a definite replacement rejection', async () => {
		const f = dispatchFixture('scheduled', Object.assign(new Error('Forbidden'), { status: 403 }));
		await expect(f.service.invoke({ moderator: f.moderator, target: f.target, action: 'ban', reason: 'replacement' })).rejects.toThrow(
			'Forbidden'
		);
		expect(f.writes[1].update.$set.status).toBeUndefined();
		expect(f.writes[1].update.$set.leaseOwner).toBeNull();
	});
	it('retains the reservation on an unknown replacement outcome and uses a distinct marker', async () => {
		const f = dispatchFixture('scheduled', new Error('network timeout'));
		await expect(f.service.invoke({ moderator: f.moderator, target: f.target, action: 'ban', reason: 'marked reason' })).rejects.toThrow(
			'network timeout'
		);
		expect(f.put.mock.calls[0][1].reason).toContain('Radon replacement ban');
		expect(f.writes[1].update.$set.status).toBeUndefined();
		expect(f.writes[1].update.$set.leaseOwner).toBeUndefined();
	});
});
