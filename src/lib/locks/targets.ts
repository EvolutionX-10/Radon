import {
	GuildChannel,
	PermissionsBitField,
	type Guild,
	type PermissionOverwriteOptions,
	type PermissionsString,
	type Role,
	type ThreadChannel
} from 'discord.js';
import type { LockTarget } from './LockService.js';

export const TEXT_FLAGS = ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads', 'SendMessagesInThreads'] as const;
export const VOICE_FLAGS = ['Connect', 'Speak'] as const;
export const THREAD_FLAGS = ['CreatePublicThreads', 'CreatePrivateThreads', 'SendMessagesInThreads'] as const;
export const SERVER_FLAGS = [...TEXT_FLAGS, ...VOICE_FLAGS] as const;

export function captureOverwrite(allow: bigint, deny: bigint, flags: readonly PermissionsString[]): PermissionOverwriteOptions {
	return Object.fromEntries(
		flags.map((flag) => {
			const bit = PermissionsBitField.Flags[flag];
			return [flag, (allow & bit) !== 0n ? true : (deny & bit) !== 0n ? false : null];
		})
	);
}

/** Restore only affected bits; retain unrelated permissions changed while locked. */
export function restoreRoleBits(current: bigint, original: bigint, mask: bigint): bigint {
	return (current & ~mask) | (original & mask);
}

function parseSnapshot(snapshot: string): Record<string, unknown> {
	const value: unknown = JSON.parse(snapshot);
	if (!value || typeof value !== 'object' || Array.isArray(value) || !('version' in value) || value.version !== 1)
		throw new Error('Unsupported lock snapshot; manual recovery is required.');
	return value as Record<string, unknown>;
}

export function channelTarget(guild: Guild, channelId: string, roleId: string, flags: readonly PermissionsString[]): LockTarget {
	async function channel() {
		const value = await guild.channels.fetch(channelId, { force: true });
		if (!(value instanceof GuildChannel) || value.isThread()) throw new Error('Channel no longer exists or does not support overwrites.');
		if (!value.permissionsFor(guild.members.me!)?.has('ManageRoles')) throw new Error('Missing Manage Roles in this channel.');
		return value;
	}
	return {
		id: `${guild.id}:channel:${channelId}:${roleId}`,
		guildId: guild.id,
		targetId: channelId,
		roleId,
		kind: 'channel',
		capture: async () => {
			const value = await channel();
			const overwrite = value.permissionOverwrites.cache.get(roleId);
			return JSON.stringify({
				version: 1,
				existed: !!overwrite,
				permissions: captureOverwrite(overwrite?.allow.bitfield ?? 0n, overwrite?.deny.bitfield ?? 0n, flags)
			});
		},
		apply: async (reason) => {
			await (await channel()).permissionOverwrites.edit(roleId, Object.fromEntries(flags.map((flag) => [flag, false])), { reason });
		},
		restore: async (snapshot, reason) => {
			const data = parseSnapshot(snapshot);
			if (!data.permissions || typeof data.permissions !== 'object' || Array.isArray(data.permissions))
				throw new Error('Invalid permission snapshot.');
			const permissions = data.permissions as Record<string, unknown>;
			if (
				!Object.entries(permissions).every(
					([key, value]) => SERVER_FLAGS.includes(key as (typeof SERVER_FLAGS)[number]) && (typeof value === 'boolean' || value === null)
				)
			)
				throw new Error('Invalid permission snapshot.');
			const value = await channel();
			const updated = await value.permissionOverwrites.edit(roleId, permissions as PermissionOverwriteOptions, { reason });
			// Delete only an overwrite we introduced, and only if it remains empty.
			const current = updated.permissionOverwrites.cache.get(roleId);
			if (!data.existed && current && current.allow.bitfield === 0n && current.deny.bitfield === 0n)
				await value.permissionOverwrites.delete(roleId, reason);
		}
	};
}

export function roleTarget(guild: Guild, roleId: string): LockTarget {
	async function role(): Promise<Role> {
		const value = await guild.roles.fetch(roleId, { force: true });
		if (!value || value.managed || (value.id !== guild.id && !value.editable))
			throw new Error('Role is managed, missing, or above my highest role.');
		if (!guild.members.me?.permissions.has('ManageRoles')) throw new Error('Missing Manage Roles.');
		return value;
	}
	const mask = new PermissionsBitField([...SERVER_FLAGS]).bitfield;
	return {
		id: `${guild.id}:role:${roleId}`,
		guildId: guild.id,
		targetId: roleId,
		roleId,
		kind: 'role',
		capture: async () => JSON.stringify({ version: 1, bits: ((await role()).permissions.bitfield & mask).toString() }),
		apply: async (reason) => {
			const value = await role();
			await value.setPermissions(value.permissions.bitfield & ~mask, reason);
		},
		restore: async (snapshot, reason) => {
			const data = parseSnapshot(snapshot);
			if (typeof data.bits !== 'string' || !/^\d+$/.test(data.bits)) throw new Error('Invalid role permission snapshot.');
			const value = await role();
			await value.setPermissions(restoreRoleBits(value.permissions.bitfield, BigInt(data.bits), mask), reason);
		}
	};
}

export function threadTarget(guild: Guild, threadId: string): LockTarget {
	async function thread(): Promise<ThreadChannel> {
		const value = await guild.channels.fetch(threadId, { force: true });
		if (!value?.isThread()) throw new Error('Thread no longer exists.');
		if (!value.manageable) throw new Error('Missing Manage Threads.');
		return value;
	}
	return {
		id: `${guild.id}:thread:${threadId}`,
		guildId: guild.id,
		targetId: threadId,
		roleId: '',
		kind: 'thread',
		capture: async () => {
			const value = await thread();
			return JSON.stringify({ version: 1, locked: !!value.locked, archived: !!value.archived });
		},
		apply: async (reason) => {
			await (await thread()).edit({ locked: true, archived: true, reason });
		},
		restore: async (snapshot, reason) => {
			const data = parseSnapshot(snapshot);
			if (typeof data.locked !== 'boolean' || typeof data.archived !== 'boolean') throw new Error('Invalid thread snapshot.');
			await (await thread()).edit({ locked: data.locked, archived: data.archived, reason });
		}
	};
}
