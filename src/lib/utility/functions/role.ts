import type { GuildMember, Message, Role } from 'discord.js';
export function managable(role: Role, message: Message<true>) {
	if (role.managed) return false;
	if (role.position > (message.guild.members.me as GuildMember).roles.highest.position) return false;
	return true;
}
