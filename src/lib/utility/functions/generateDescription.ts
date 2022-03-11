import type { Timestamp } from '#lib/structures';
import { GuildMember, User } from 'discord.js';

export function generateModLogDescription(
    member: GuildMember | User,
    action: string,
    reason?: string,
    duration?: Timestamp
) {
    let description = `**Member**: ${
        member instanceof GuildMember ? member.user.tag : member.tag
    } [\`${member.id}\`]`;
    description += `\n**Action**: ${action}`;
    description += `\n**Reason**: ${reason ?? 'Not Provided'}`;
    if (duration)
        description += `\n**Expires**: ${duration.getShortDateTime()} [${duration.getRelativeTime()}]`;
    return description;
}
