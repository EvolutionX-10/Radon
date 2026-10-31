import { Owners } from '#constants';
import type { GuildMember, User } from 'discord.js';

export function isAdmin(member: GuildMember): boolean {
	return member.permissions.has('Administrator') || member.permissions.has('ManageGuild');
}

export function isModerator(member: GuildMember, configuredRoleIds: readonly string[] = []): boolean {
	return isAdmin(member) || member.roles.cache.some((role) => configuredRoleIds.includes(role.id));
}

export function isGuildOwner(member: GuildMember): boolean {
	return member.id === member.guild.ownerId;
}

export function isOwner(user: User): boolean {
	return Owners.includes(user.id);
}
