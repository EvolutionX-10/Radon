import { Emojis } from '#constants';
import { GuildMember, User, type PermissionsString } from 'discord.js';
import { isAdmin, isGuildOwner } from './permissions.js';

/** Shared target and bot-capability checks for manual and automated moderation. */
export function runAllChecks(executor: GuildMember, target: GuildMember | User, action: string) {
	const deny = (message: string) => ({ result: false, content: `${Emojis.Cross} ${message}` });
	const bot = executor.guild.members.me;
	if (target.id === executor.id) return deny(`You can't ${action} yourself.`);
	if (target.id === executor.guild.ownerId) return deny(`I can't ${action} the server owner.`);
	if (target.id === bot?.id) return deny(`I can't ${action} myself.`);

	const kind = action === 'soft ban' ? 'softban' : action;
	const permission: PermissionsString | undefined =
		kind === 'ban' || kind === 'softban' ? 'BanMembers' : kind === 'kick' ? 'KickMembers' : kind === 'timeout' ? 'ModerateMembers' : undefined;
	if (permission && (!bot || !bot.permissions.has(permission))) return deny(`I need ${permission} to ${action} ${target}.`);

	// A non-member can be banned by ID; member-only actions must never silently succeed.
	if (target instanceof User) {
		return kind === 'ban' || kind === 'softban' ? { result: true, content: '' } : deny(`You must select a server member to ${action}.`);
	}
	if (target.guild.id !== executor.guild.id) return deny('The target must belong to this server.');
	if (!target.manageable || isAdmin(target) || isGuildOwner(target)) return deny(`I can't ${action} ${target}.`);
	if (!isGuildOwner(executor) && executor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
		return deny(`You can't ${action} ${target}: their highest role is equal to or above yours.`);
	}
	if ((kind === 'ban' || kind === 'softban') && !target.bannable) return deny(`I can't ban ${target}.`);
	if (kind === 'kick' && !target.kickable) return deny(`I can't kick ${target}.`);
	if (kind === 'timeout' && (!target.moderatable || target.user.bot)) return deny(`I can't timeout ${target}.`);
	return { result: true, content: '' };
}
