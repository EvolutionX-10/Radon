import { GuildMember } from 'discord.js';
//todo fix it
export function isGuildMember(member: GuildMember): member is GuildMember {
    return member instanceof GuildMember;
}
