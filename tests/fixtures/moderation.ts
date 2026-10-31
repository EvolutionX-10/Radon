import { mock } from 'bun:test';
import { Collection, PermissionsBitField, User, type Guild, type GuildMember, type PermissionsString } from 'discord.js';

export function makeMember(
	options: {
		id?: string;
		permissions?: PermissionsString[];
		manageable?: boolean;
		highestPosition?: number;
		ownerId?: string;
		roles?: Array<{ id: string; name: string }>;
		bannable?: boolean;
		kickable?: boolean;
		moderatable?: boolean;
		isBot?: boolean;
	} = {}
) {
	const {
		id = 'target',
		permissions = [],
		manageable = true,
		highestPosition = 1,
		ownerId = 'owner',
		roles = [],
		bannable = true,
		kickable = true,
		moderatable = true,
		isBot = false
	} = options;
	const bot = { id: 'bot', permissions: new PermissionsBitField(['BanMembers', 'KickMembers', 'ModerateMembers']) };
	const guild = {
		id: 'guild',
		ownerId,
		members: { me: bot, unban: mock(async () => {}) },
		bans: { create: mock(async () => {}) }
	} as unknown as Guild;
	const member = {
		id,
		manageable,
		bannable,
		kickable,
		moderatable,
		user: { bot: isBot },
		permissions: new PermissionsBitField(permissions),
		roles: {
			highest: { position: highestPosition, comparePositionTo: (other: { position: number }) => highestPosition - other.position },
			cache: new Collection(roles.map((role) => [role.id, role]))
		},
		guild,
		kick: mock(async () => {}),
		disableCommunicationUntil: mock(async () => {}),
		toString: () => `<@${id}>`,
		valueOf: () => id
	} as unknown as GuildMember;
	return member;
}

export const makeExecutor = (options: Parameters<typeof makeMember>[0] = {}) =>
	makeMember({ id: 'mod', highestPosition: 10, permissions: ['ManageGuild'], ...options });
export const makeUserTarget = (id = 'user-target') => Object.assign(Object.create(User.prototype), { id }) as User;
