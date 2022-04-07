import type { Timestamp } from '#lib/structures';
import { GuildMember, User } from 'discord.js';

export function generateModLogDescription({
	member,
	action,
	reason,
	duration,
	warnId
}: {
	member: GuildMember | User;
	action: string;
	reason?: string;
	duration?: Timestamp;
	warnId?: string;
}) {
	let description = `**Member**: ${member instanceof GuildMember ? member.user.tag : member.tag} [\`${member.id}\`]`;
	description += `\n**Action**: ${action}`;
	description += `\n**Reason**: ${reason ?? 'Not Provided'}`;
	if (duration) description += `\n**Expires**: ${duration.getShortDateTime()} [${duration.getRelativeTime()}]`;
	if (warnId) description += `\n**Warn ID**: \`${warnId}\``;
	return description;
}
