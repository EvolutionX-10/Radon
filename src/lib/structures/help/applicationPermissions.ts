import {
	ApplicationCommandPermissionType,
	PermissionFlagsBits,
	type ApplicationCommand,
	type ApplicationCommandPermissions,
	type ChatInputCommandInteraction,
	type Collection
} from 'discord.js';

/** Resolve Discord's command overwrites separately from the bot's own preconditions. */
export function canUseApplicationCommand(
	command: ApplicationCommand,
	interaction: ChatInputCommandInteraction<'cached'>,
	permissions: Collection<string, ApplicationCommandPermissions[]>
): boolean {
	const { member, memberPermissions, guildId } = interaction;
	if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
	if (!memberPermissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.UseApplicationCommands])) return false;

	// An unsynced command replaces the app-wide overwrites, including an empty set.
	const overwrites = permissions.get(command.id) ?? permissions.get(command.applicationId) ?? [];
	const user = overwrites.find((entry) => entry.type === ApplicationCommandPermissionType.User && entry.id === interaction.user.id);
	const roles = overwrites.filter(
		(entry) => entry.type === ApplicationCommandPermissionType.Role && entry.id !== guildId && member.roles.cache.has(entry.id)
	);
	const everyone = overwrites.find((entry) => entry.type === ApplicationCommandPermissionType.Role && entry.id === guildId);
	const defaults = command.defaultMemberPermissions;
	const defaultAllowed = defaults === null || (defaults.bitfield !== 0n && memberPermissions.has(defaults));
	// @everyone represents the command's default permissions; allowing it does not
	// grant the permissions required by default_member_permissions.
	const memberAllowed =
		user?.permission ?? (roles.length ? roles.some((entry) => entry.permission) : everyone?.permission !== false && defaultAllowed);

	// Threads inherit application command restrictions from their parent channel.
	const channelId = interaction.channel?.isThread() ? interaction.channel.parentId : interaction.channelId;
	const channel = overwrites.find((entry) => entry.type === ApplicationCommandPermissionType.Channel && entry.id === channelId);
	const allChannels = overwrites.find(
		(entry) => entry.type === ApplicationCommandPermissionType.Channel && entry.id === (BigInt(guildId) - 1n).toString()
	);
	return memberAllowed && (channel?.permission ?? allChannels?.permission ?? true);
}
