import type { GuildMember, Message, Role } from 'discord.js';
export function managable(role: Role, message: Message) {
    if (role.managed) return false;
    if (
        role.position >
        (message.guild?.me as GuildMember).roles.highest.position
    )
        return false;
    return true;
}
