import type { APIInteractionDataResolvedGuildMember, APIInteractionGuildMember } from 'discord-api-types/v9';
import { GuildMember } from 'discord.js';

export function isGuildMember(member: GuildMember | APIInteractionGuildMember | APIInteractionDataResolvedGuildMember): member is GuildMember {
	return member instanceof GuildMember;
}
