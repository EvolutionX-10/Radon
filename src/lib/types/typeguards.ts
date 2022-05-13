import type { APIInteractionGuildMember } from 'discord-api-types/v9';
import { GuildMember } from 'discord.js';

export function isGuildMember(member: GuildMember | APIInteractionGuildMember): member is GuildMember {
	return member instanceof GuildMember;
}
