import { Owners } from '#constants';
import type { GuildMember, User } from 'discord.js';

export function isAdmin(member: GuildMember): boolean {
	return member.permissions.has('ADMINISTRATOR') || member.permissions.has('MANAGE_GUILD');
}

export function isModerator(member: GuildMember): boolean {
	return isAdmin(member) || member.roles.cache.some((r) => r.name.toLowerCase().includes('moderator'));
}

export function isGuildOwner(member: GuildMember): boolean {
	return member.id === member.guild.ownerId;
}

export function isOwner(user: User): boolean {
	return Owners.includes(user.id);
}
