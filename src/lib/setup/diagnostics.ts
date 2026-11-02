import { Emojis } from '#constants';
import type { PrismaClient } from '@prisma/client';
import { ChannelType, type Guild } from 'discord.js';
import { card, divider, safe, text } from '../presentation/components.js';

type Read<T> = { ok: true; value: T } | { ok: false };
async function read<T>(run: () => Promise<T>): Promise<Read<T>> {
	try {
		return { ok: true, value: await run() };
	} catch {
		return { ok: false };
	}
}
const label = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2');
const line = (state: 'ok' | 'warn' | 'info' | 'unknown', value: string) =>
	`${{ ok: Emojis.Confirm, warn: '⚠', info: '•', unknown: '?' }[state]} ${value}`;

/** Read-only, guild-scoped evidence. Missing data is unknown, never a healthy default. */
export async function diagnosticPages(prisma: PrismaClient, guild: Guild) {
	const now = new Date();
	const overdue = new Date(now.getTime() - 60_000);
	const [settings, reports, automod, me, roles, channels, native, application, bans, locks] = await Promise.all([
		read(() => prisma.guildSettings.findUnique({ where: { id: guild.id } })),
		read(() => prisma.moderationReportSettings.findUnique({ where: { id: guild.id } })),
		read(() => prisma.automodConfig.findUnique({ where: { id: guild.id } })),
		read(() => guild.members.fetchMe({ force: true })),
		read(() => guild.roles.fetch()),
		read(() => guild.channels.fetch()),
		read(() => guild.autoModerationRules.fetch()),
		read(async () => {
			if (!guild.client.application) throw new Error('Application unavailable');
			return guild.client.application.fetch();
		}),
		read(() =>
			prisma.moderationScheduledBan.count({
				where: {
					guildId: guild.id,
					status: { in: ['preparing', 'scheduled'] },
					dueAt: { lt: overdue },
					nextAttemptAt: { lte: now },
					OR: [{ leaseUntil: null }, { leaseUntil: { isSet: false } }, { leaseUntil: { lte: now } }]
				}
			})
		),
		read(() =>
			prisma.channelLockSnapshot.count({
				where: {
					guildId: guild.id,
					expiresAt: { lt: overdue },
					AND: [
						{ OR: [{ leaseUntil: null }, { leaseUntil: { isSet: false } }, { leaseUntil: { lte: now } }] },
						{ OR: [{ retryAfter: null }, { retryAfter: { isSet: false } }, { retryAfter: { lte: now } }] }
					]
				}
			})
		)
	]);
	const setup = card('Radon diagnostics · Configuration', `Read only · ${safe(guild.name, 100)} · <t:${Math.floor(now.getTime() / 1000)}:f>`);
	text(
		setup,
		settings.ok
			? line(
					settings.value?.configured ? 'ok' : 'info',
					settings.value?.configured ? 'Setup has been saved.' : 'Setup is incomplete. Run `/setup start` when ready.'
				)
			: line('unknown', 'Could not read saved settings. Check database availability and retry.')
	);
	if (settings.ok && roles.ok) {
		const missing = [...(settings.value?.modRoles ?? []), ...(settings.value?.adminRoles ?? [])].filter((id) => !roles.value.has(id));
		text(
			setup,
			missing.length
				? line(
						'warn',
						`${missing.length} saved staff role(s) were removed. Update them with /setup start.\n${missing
							.slice(0, 10)
							.map((id) => `\`${id}\``)
							.join(', ')}`
					)
				: line('ok', 'Saved staff roles exist. Empty additional role lists use Discord permission defaults.')
		);
	} else if (!roles.ok) text(setup, line('unknown', 'Could not refresh the server role list.'));
	const destination = (name: string, id: string | undefined, privateOnly: boolean) => {
		if (!id) return line('info', `${name}: not configured (optional).`);
		if (!channels.ok || !me.ok) return line('unknown', `${name}: <#${id}> could not be checked.`);
		const channel = channels.value.get(id);
		if (!channel || channel.type !== ChannelType.GuildText)
			return line('warn', `${name}: channel \`${id}\` is missing or is not a text channel. Choose another in /setup start.`);
		const missing = channel.permissionsFor(me.value).missing(['ViewChannel', 'SendMessages', 'EmbedLinks']);
		if (missing.length) return line('warn', `${name}: <#${id}> needs ${missing.map(label).join(', ')} for Radon.`);
		if (privateOnly && channel.permissionsFor(guild.roles.everyone).has('ViewChannel'))
			return line('warn', `${name}: <#${id}> is visible to @everyone. Use a private staff channel.`);
		return line(
			'ok',
			`${name}: <#${id}> is usable.${privateOnly ? ' Hidden from @everyone; review other role and member overwrites for staff-only access.' : ' Existing visibility is preserved.'}`
		);
	};
	text(
		setup,
		settings.ok
			? destination('Moderation logs', settings.value?.modLogChannel, false)
			: line('unknown', 'Moderation log destination unavailable.')
	);
	text(
		setup,
		reports.ok ? destination('Member reports', reports.value?.channelId, true) : line('unknown', 'Could not read the report destination.')
	);
	const permissions = card('Radon diagnostics · Permissions and roles');
	if (!me.ok) text(permissions, line('unknown', 'Could not refresh Radon’s membership. Permission and hierarchy checks are unavailable.'));
	else {
		const groups = {
			Ban: 'BanMembers',
			Kick: 'KickMembers',
			Timeout: 'ModerateMembers',
			'AutoMod and verification protection': 'ManageGuild',
			'Create channels': 'ManageChannels',
			'Role and overwrite changes': 'ManageRoles',
			'Message deletion': 'ManageMessages'
		} as const;
		text(
			permissions,
			Object.entries(groups)
				.map(([name, permission]) =>
					line(
						me.value.permissions.has(permission) ? 'ok' : 'info',
						`${name}: ${me.value.permissions.has(permission) ? 'permission present' : `needs ${label(permission)}`}`
					)
				)
				.join('\n')
		);
		text(
			permissions,
			'Only grant permissions for features you use. Channel overwrites and target-specific checks still apply. Administrator is not required.'
		);
		if (roles.ok) {
			const blocked = roles.value.filter(
				(role) => role.id !== guild.id && !role.managed && role.comparePositionTo(me.value.roles.highest) >= 0
			);
			text(
				permissions,
				line(
					blocked.size ? 'info' : 'ok',
					blocked.size
						? `Members with ${blocked.size} role(s) at or above Radon cannot be moderated by it. Move Radon above the roles it should manage.\n${[
								...blocked.values()
							]
								.slice(0, 5)
								.map((r) => `<@&${r.id}>`)
								.join(', ')}${blocked.size > 5 ? ' …' : ''}`
						: 'Radon is above all non-managed member roles. The server owner still cannot be targeted.'
				)
			);
			text(
				permissions,
				line(
					guild.roles.everyone.permissions.has('Administrator') ? 'warn' : 'ok',
					guild.roles.everyone.permissions.has('Administrator')
						? '@everyone has Administrator. Remove that permission.'
						: `Role inventory: ${roles.value.size} total; ${roles.value.filter((r) => !r.managed && r.permissions.has('Administrator')).size} non-managed roles have Administrator. Counts alone do not indicate a problem.`
				)
			);
		}
		if (channels.ok) {
			const issues: string[] = [];
			let checked = 0;
			for (const channel of channels.value.values()) {
				if (!channel || channel.type !== ChannelType.GuildText) continue;
				const permission = channel.permissionsFor(me.value);
				if (!permission.has('ViewChannel')) continue;
				checked++;
				const missing = permission.missing([
					'SendMessages',
					'EmbedLinks',
					...(automod.ok &&
					automod.value &&
					(automod.value.floodMode === 'enforce' || automod.value.linkMode === 'enforce') &&
					!automod.value.exemptChannelIds.includes(channel.id)
						? ['ManageMessages' as const]
						: [])
				]);
				if (missing.length) issues.push(`<#${channel.id}>: ${missing.map(label).join(', ')}`);
			}
			text(
				permissions,
				line(
					issues.length ? 'info' : 'ok',
					`${checked} visible text channels checked; ${issues.length} have feature limitations.${issues.length ? `\n${issues.slice(0, 7).join('\n')}${issues.length > 7 ? `\n… ${issues.length - 7} more. Check channel overwrites.` : ''}` : ''}`
				)
			);
		} else text(permissions, line('unknown', 'Could not refresh channels; channel permissions were not checked.'));
	}
	const protection = card('Radon diagnostics · Protection and intents');
	for (const [intent, name, flag, limited] of [
		['MessageContent', 'Message Content', 'GatewayMessageContent', 'GatewayMessageContentLimited'],
		['GuildMembers', 'Guild Members', 'GatewayGuildMembers', 'GatewayGuildMembersLimited']
	] as const) {
		const requested = guild.client.options.intents.has(intent);
		const access = application.ok ? application.value.flags.has(flag) || application.value.flags.has(limited) : null;
		text(
			protection,
			`**${name}**\n${line(requested ? 'ok' : 'info', `Requested by running client: ${requested ? 'yes' : 'no'}.`)}\n${line(access === null ? 'unknown' : access ? 'ok' : 'info', access === null ? 'Could not read Discord application access flags.' : `Discord application access flags: ${access ? 'advertised' : 'not indicated; the operator should check the Developer Portal'}.`)}`
		);
	}
	text(
		protection,
		'Runtime requests and Discord access are separate checks. Portal review/approval status cannot be established here. Missing access needs the bot operator; server administrators cannot enable it through setup.'
	);
	if (automod.ok) {
		const config = automod.value;
		text(
			protection,
			config
				? `**Custom rules:** flood ${safe(config.floodMode)}, links ${safe(config.linkMode)}, joins ${safe(config.raidMode)}.\n${destination('Custom alerts', config.alertChannelId, false)}`
				: line('info', 'Custom rules are off; no configuration saved.')
		);
		if (config && (config.floodMode !== 'off' || config.linkMode !== 'off') && !guild.client.options.intents.has('MessageContent'))
			text(
				protection,
				line('warn', 'Message rules are configured but cannot run without Message Content. Ask the operator to enable access and reconnect.')
			);
		if (config && config.raidMode !== 'off' && !guild.client.options.intents.has('GuildMembers'))
			text(
				protection,
				line('warn', 'Join protection is configured but cannot run without Guild Members. Ask the operator to enable access and reconnect.')
			);
	} else text(protection, line('unknown', 'Could not read custom AutoMod settings.'));
	text(
		protection,
		native.ok
			? line(
					'info',
					`${native.value.filter((rule) => rule.creatorId === guild.client.user.id && rule.name.startsWith('Radon: ')).size} native Radon rules found. Native rules do not require Message Content and Discord enforces them independently. Use /automod status for modes and quotas.`
				)
			: line('unknown', 'Could not inspect native AutoMod rules. Check Manage Server and retry.')
	);
	const recovery = card('Radon diagnostics · Scheduled recovery');
	text(
		recovery,
		bans.ok
			? line(bans.value ? 'warn' : 'ok', `${bans.value} temporary ban(s) overdue by more than one minute and eligible for a worker retry.`)
			: line('unknown', 'Could not inspect temporary bans.')
	);
	text(
		recovery,
		locks.ok
			? line(locks.value ? 'warn' : 'ok', `${locks.value} timed lock(s) overdue by more than one minute and eligible for a worker retry.`)
			: line('unknown', 'Could not inspect timed locks.')
	);
	if (automod.ok) {
		const at = automod.value?.raidRestoreAt;
		const lease = automod.value?.raidLeaseUntil;
		text(
			recovery,
			at
				? line(
						at < overdue && (!lease || lease < now) ? 'warn' : 'info',
						`Verification restoration pending for <t:${Math.floor(at.getTime() / 1000)}:f>.${lease && lease > now ? ' A worker lease is active.' : ''}`
					)
				: line('ok', 'No verification restoration is pending.')
		);
	} else text(recovery, line('unknown', 'Could not inspect verification restoration.'));
	text(
		recovery,
		'This report never runs recovery or changes a ban, lock, or verification level. If overdue work remains, the operator should check worker logs, permissions and database connectivity. Active leases and retry backoff can delay work.'
	);
	for (const panel of [setup, permissions, protection, recovery]) {
		divider(panel);
		text(panel, 'View saved settings with `/setup view`. Refresh this report after making changes.');
	}
	return [setup, permissions, protection, recovery];
}
