import type { PrismaClient } from '@prisma/client';
import type { GuildMember } from 'discord.js';

/** Component handlers run outside command preconditions; check current member and configured IDs. */
export async function isModerationStaff(member: GuildMember, prisma: PrismaClient): Promise<boolean> {
	if (member.id === member.guild.ownerId || member.permissions.has('Administrator') || member.permissions.has('ManageGuild')) return true;
	const settings = await prisma.guildSettings.findUnique({ where: { id: member.guild.id } });
	const ids = [...(settings?.adminRoles ?? []), ...(settings?.modRoles ?? [])];
	return member.roles.cache.some((role) => ids.includes(role.id));
}
