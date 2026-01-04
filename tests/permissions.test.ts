import { describe, expect, it } from 'bun:test';
import { User, type GuildMember } from 'discord.js';
import { Emojis } from '../src/lib/utility/constants.js';
import { runAllChecks } from '../src/lib/utility/functions/modperms.js';
import { isAdmin, isGuildOwner, isModerator, isOwner } from '../src/lib/utility/functions/permissions.js';

type PermissionFlag = 'Administrator' | 'ManageGuild';

function makeMember(options?: {
	id?: string;
	permissions?: PermissionFlag[];
	manageable?: boolean;
	highestPosition?: number;
	ownerId?: string;
	roleNames?: string[];
}) {
	const { id = 'member', permissions = [], manageable = true, highestPosition = 1, ownerId = 'owner', roleNames = [] } = options ?? {};
	const permissionSet = new Set<PermissionFlag>(permissions);

	const member: Partial<GuildMember> = {
		id,
		manageable,
		permissions: {
			has: (perm: PermissionFlag) => permissionSet.has(perm)
		} as GuildMember['permissions'],
		roles: {
			highest: { position: highestPosition },
			cache: {
				some: (predicate: (role: { name: string }) => boolean) => roleNames.some((name) => predicate({ name }))
			}
		} as GuildMember['roles'],
		guild: { ownerId } as GuildMember['guild'],
		toString: () => `<@${id}>`,
		valueOf: () => id
	};

	return member as GuildMember;
}

function makeUserTarget(id = 'user-target') {
	return Object.assign(Object.create(User.prototype), { id }) as User;
}

describe('permission helpers', () => {
	it('detects administrators and moderators', () => {
		const admin = makeMember({ permissions: ['Administrator'] });
		const mod = makeMember({ roleNames: ['cool moderator'] });
		const regular = makeMember();

		expect(isAdmin(admin)).toBe(true);
		expect(isAdmin(regular)).toBe(false);
		expect(isModerator(mod)).toBe(true);
		expect(isModerator(regular)).toBe(false);
	});

	it('detects guild owners and bot owners', () => {
		const ownerMember = makeMember({ id: '123', ownerId: '123' });
		const nonOwner = makeMember({ id: '456', ownerId: '123' });
		const botOwner = { id: '697795666373640213' } as User;
		const outsider = { id: '111' } as User;

		expect(isGuildOwner(ownerMember)).toBe(true);
		expect(isGuildOwner(nonOwner)).toBe(false);
		expect(isOwner(botOwner)).toBe(true);
		expect(isOwner(outsider)).toBe(false);
	});
});

describe('runAllChecks moderation guardrail', () => {
	const action = 'ban';

	it('permits when the target is a plain User', () => {
		const executor = makeMember();
		const target = makeUserTarget();
		const result = runAllChecks(executor, target, action);
		expect(result).toEqual({ result: true, content: '' });
	});

	it('blocks unmanageable members', () => {
		const executor = makeMember();
		const target = makeMember({ manageable: false });
		target.toString = () => '<@target>';
		const result = runAllChecks(executor, target, action);
		expect(result.result).toBe(false);
		expect(result.content).toContain(Emojis.Cross);
		expect(result.content).toContain('<@target>');
	});

	it('blocks privileged targets (admin or owner)', () => {
		const executor = makeMember({ highestPosition: 10 });
		const adminTarget = makeMember({ permissions: ['Administrator'] });
		adminTarget.toString = () => '<@admin>';
		const ownerTarget = makeMember({ id: 'owner', ownerId: 'owner' });
		ownerTarget.toString = () => '<@owner>';

		const adminResult = runAllChecks(executor, adminTarget, action);
		const ownerResult = runAllChecks(executor, ownerTarget, action);

		expect(adminResult.result).toBe(false);
		expect(adminResult.content).toContain(Emojis.Cross);
		expect(ownerResult.result).toBe(false);
		expect(ownerResult.content).toContain(Emojis.Cross);
	});

	it('blocks when executor and target share the same top role position', () => {
		const executor = makeMember({ highestPosition: 5 });
		const target = makeMember({ highestPosition: 5 });
		target.toString = () => '<@peer>';

		const result = runAllChecks(executor, target, action);
		expect(result.result).toBe(false);
		expect(result.content).toContain(Emojis.Cross);
		expect(result.content).toContain('<@peer>');
	});

	it('allows moderation when hierarchy permits', () => {
		const executor = makeMember({ highestPosition: 10 });
		const target = makeMember({ highestPosition: 3 });

		expect(runAllChecks(executor, target, action)).toEqual({ result: true, content: '' });
	});
});
