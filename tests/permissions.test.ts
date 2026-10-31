import { describe, expect, it } from 'bun:test';
import { PermissionsBitField, type User } from 'discord.js';
import { runAllChecks } from '../src/lib/utility/functions/modperms.js';
import { isAdmin, isGuildOwner, isModerator, isOwner } from '../src/lib/utility/functions/permissions.js';
import { makeExecutor, makeMember, makeUserTarget } from './fixtures/moderation.js';

describe('permission helpers', () => {
	it('recognizes native administrators and configured role IDs, never role names', () => {
		const admin = makeMember({ permissions: ['Administrator'] });
		const namedMod = makeMember({ roles: [{ id: 'ordinary', name: 'cool moderator' }] });
		const staff = makeMember({ roles: [{ id: 'staff', name: 'Helpers' }] });
		expect(isAdmin(admin)).toBe(true);
		expect(isModerator(admin)).toBe(true);
		expect(isModerator(namedMod)).toBe(false);
		expect(isModerator(staff, ['staff'])).toBe(true);
		expect(isModerator(staff, ['other'])).toBe(false);
	});

	it('detects guild owners and bot owners', () => {
		expect(isGuildOwner(makeMember({ id: 'owner' }))).toBe(true);
		expect(isGuildOwner(makeMember())).toBe(false);
		expect(isOwner({ id: '697795666373640213' } as User)).toBe(true);
		expect(isOwner({ id: 'outsider' } as User)).toBe(false);
	});
});

describe('moderation guardrails', () => {
	it('permits ID bans but rejects member-only actions on a plain User', () => {
		const executor = makeExecutor();
		expect(runAllChecks(executor, makeUserTarget(), 'ban').result).toBe(true);
		expect(runAllChecks(executor, makeUserTarget(), 'kick').result).toBe(false);
		expect(runAllChecks(executor, makeUserTarget(), 'timeout').result).toBe(false);
	});

	it('rejects self, bot and server owner, including targets supplied as a User', () => {
		const executor = makeExecutor();
		for (const id of ['mod', 'bot', 'owner']) {
			expect(runAllChecks(executor, makeUserTarget(id), 'ban').result).toBe(false);
			expect(runAllChecks(executor, makeMember({ id }), 'ban').result).toBe(false);
		}
	});

	it('rejects targets above or equal to the moderator, including administrators', () => {
		for (const position of [10, 11]) {
			expect(runAllChecks(makeExecutor(), makeMember({ highestPosition: position }), 'ban').result).toBe(false);
			expect(runAllChecks(makeExecutor({ permissions: ['Administrator'] }), makeMember({ highestPosition: position }), 'ban').result).toBe(
				false
			);
		}
	});

	it('lets the server owner bypass their own role hierarchy while retaining bot restrictions', () => {
		expect(runAllChecks(makeExecutor({ id: 'owner' }), makeMember({ highestPosition: 20 }), 'ban').result).toBe(true);
		expect(runAllChecks(makeExecutor({ id: 'owner' }), makeMember({ highestPosition: 20, manageable: false }), 'ban').result).toBe(false);
	});

	it('rejects unmanageable and protected targets and permits a lower member', () => {
		const executor = makeExecutor();
		expect(runAllChecks(executor, makeMember({ manageable: false }), 'ban').result).toBe(false);
		expect(runAllChecks(executor, makeMember({ permissions: ['Administrator'] }), 'ban').result).toBe(false);
		expect(runAllChecks(executor, makeMember({ permissions: ['ManageGuild'] }), 'warn').result).toBe(false);
		expect(runAllChecks(executor, makeMember(), 'ban')).toEqual({ result: true, content: '' });
	});

	it('requires action-specific bot permissions, including for ID bans', () => {
		const executor = makeExecutor();
		Object.assign(executor.guild.members.me!, { permissions: new PermissionsBitField() });
		for (const action of ['ban', 'softban', 'kick', 'timeout']) expect(runAllChecks(executor, makeMember(), action).result).toBe(false);
		expect(runAllChecks(executor, makeUserTarget(), 'ban').result).toBe(false);
		Object.assign(executor.guild.members.me!, { permissions: new PermissionsBitField(['BanMembers']) });
		expect(runAllChecks(executor, makeMember(), 'ban').result).toBe(true);
		expect(runAllChecks(executor, makeMember(), 'kick').result).toBe(false);
	});

	it('checks bannability, kickability and timeout eligibility separately', () => {
		expect(runAllChecks(makeExecutor(), makeMember({ bannable: false }), 'ban').result).toBe(false);
		expect(runAllChecks(makeExecutor(), makeMember({ kickable: false }), 'kick').result).toBe(false);
		expect(runAllChecks(makeExecutor(), makeMember({ moderatable: false }), 'timeout').result).toBe(false);
		expect(runAllChecks(makeExecutor(), makeMember({ isBot: true }), 'timeout').result).toBe(false);
	});

	it('rejects a member from another server', () => {
		const target = makeMember();
		Object.assign(target, { guild: { ...target.guild, id: 'other-guild' } });
		expect(runAllChecks(makeExecutor(), target, 'ban').result).toBe(false);
	});
});
