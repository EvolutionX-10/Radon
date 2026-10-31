import type { PrismaClient } from '@prisma/client';
import { ChannelType, PermissionFlagsBits, type Guild, type GuildMember, type TextChannel } from 'discord.js';
import { Owners } from '../utility/constants.js';
import { nativeRule } from '../automod/rules.js';
import { autoModService } from '../automod/service.js';

export async function readConfiguration(prisma: Pick<PrismaClient, 'guildSettings' | 'moderationReportSettings' | 'automodConfig'>, guildId: string) {
	const [settings, reports, automod] = await Promise.all([
		prisma.guildSettings.findUnique({ where: { id: guildId } }),
		prisma.moderationReportSettings.findUnique({ where: { id: guildId } }),
		prisma.automodConfig.findUnique({ where: { id: guildId } })
	]);
	return { settings, reports, automod };
}
export type Configuration = Awaited<ReturnType<typeof readConfiguration>>;
export type Protection = 'mentions' | 'spam' | 'flood' | 'raid';
export interface SetupDraft {
	modRoles: string[];
	adminRoles: string[];
	log: 'existing' | 'create' | 'none';
	logChannelId: string;
	reports: 'existing' | 'log' | 'none';
	reportChannelId: string;
	protection: Protection[];
}
export function draftConfiguration(current: Configuration): SetupDraft {
	return {
		modRoles: [...(current.settings?.modRoles ?? [])],
		adminRoles: [...(current.settings?.adminRoles ?? [])],
		log: current.settings?.modLogChannel ? 'existing' : 'none',
		logChannelId: current.settings?.modLogChannel ?? '',
		reports: current.reports?.channelId ? 'existing' : 'none',
		reportChannelId: current.reports?.channelId ?? '',
		protection: []
	};
}

/** Collectors do not rerun Sapphire preconditions. Never trust the opening interaction's roles. */
export async function requireSetupAdmin(guild: Guild, prisma: PrismaClient, userId: string): Promise<GuildMember> {
	const member = await guild.members.fetch({ user: userId, force: true });
	if (member.id === guild.ownerId || Owners.includes(userId) || member.permissions.has('ManageGuild') || member.permissions.has('Administrator'))
		return member;
	const settings = await prisma.guildSettings.findUnique({ where: { id: guild.id } });
	if (member.roles.cache.some((role) => settings?.adminRoles.includes(role.id))) return member;
	throw new Error('Administrator access was removed. Ask a server administrator to continue.');
}

export function sameConfiguration(left: Configuration, right: Configuration) {
	return JSON.stringify(left) === JSON.stringify(right);
}

export async function validateSetup(guild: Guild, actor: GuildMember, draft: SetupDraft) {
	await guild.roles.fetch();
	for (const id of [...draft.modRoles, ...draft.adminRoles]) {
		const role = guild.roles.cache.get(id);
		if (!role || role.id === guild.id || role.managed) throw new Error('Choose existing staff roles other than @everyone or managed bot roles.');
	}
	if (draft.modRoles.some((id) => draft.adminRoles.includes(id))) throw new Error('Choose separate moderator and administrator roles.');
	const me = await guild.members.fetchMe({ force: true });
	if (draft.log === 'create' && !me.permissions.has(['ManageChannels', 'ManageRoles', 'ViewChannel', 'SendMessages', 'EmbedLinks']))
		throw new Error(
			'Creating the private staff channel needs Manage Channels, Manage Roles, View Channel, Send Messages and Embed Links. Choose an existing channel or skip logs.'
		);
	const checkChannel = async (id: string, privateOnly: boolean): Promise<TextChannel> => {
		const channel = await guild.channels.fetch(id);
		if (!channel || channel.type !== ChannelType.GuildText) throw new Error('A selected text channel was removed. Choose another channel.');
		if (!channel.permissionsFor(actor).has('ViewChannel')) throw new Error('You must be able to view each selected channel.');
		if (!channel.permissionsFor(me).has(['ViewChannel', 'SendMessages', 'EmbedLinks']))
			throw new Error('Radon needs View Channel, Send Messages and Embed Links in each selected channel.');
		if (privateOnly && channel.permissionsFor(guild.roles.everyone).has('ViewChannel'))
			throw new Error('Reports need a staff channel hidden from @everyone. Review its other role and member overwrites too.');
		return channel;
	};
	if (draft.log === 'existing') await checkChannel(draft.logChannelId, draft.reports === 'log');
	if (draft.reports === 'existing') await checkChannel(draft.reportChannelId, true);
	if (draft.reports === 'log' && draft.log === 'none') throw new Error('Choose a log channel before using it for reports.');
	if (draft.protection.length) {
		if (!actor.permissions.has('ManageGuild') || !me.permissions.has('ManageGuild'))
			throw new Error('You and Radon need Manage Server to configure protection. You can leave protection unchanged.');
		if (draft.log === 'none') throw new Error('Choose a staff log channel for protection alerts, or leave protection unchanged.');
		if (draft.protection.includes('flood') && !guild.client.options.intents.has('MessageContent'))
			throw new Error('Duplicate detection is unavailable in this installation. Leave it unchecked.');
		if (draft.protection.includes('raid') && !guild.client.options.intents.has('GuildMembers'))
			throw new Error('Join detection is unavailable in this installation. Leave it unchecked.');
	}
	return me;
}

/** All Discord mutations happen after review. Existing channel overwrites are never edited. */
export async function saveSetup(prisma: PrismaClient, guild: Guild, actorId: string, initial: Configuration, draft: SetupDraft) {
	const actor = await requireSetupAdmin(guild, prisma, actorId);
	const me = await validateSetup(guild, actor, draft);
	if (!sameConfiguration(initial, await readConfiguration(prisma, guild.id)))
		throw new Error('Configuration changed while setup was open. Run /setup again to review the latest settings.');
	if (draft.protection.some((p) => p === 'flood' || p === 'raid') && initial.automod?.alertChannelId) {
		const alerts = await guild.channels.fetch(initial.automod.alertChannelId);
		if (
			!alerts ||
			alerts.type !== ChannelType.GuildText ||
			!alerts.permissionsFor(actor).has('ViewChannel') ||
			!alerts.permissionsFor(me).has(['ViewChannel', 'SendMessages', 'EmbedLinks'])
		)
			throw new Error('The existing custom alert channel is unavailable. Fix its access with /automod, or leave custom protection unchanged.');
	}
	let created: TextChannel | undefined;
	let committed = false;
	const notes: string[] = [];
	try {
		if (draft.log === 'create') {
			created = await guild.channels.create({
				name: 'radon-staff',
				type: ChannelType.GuildText,
				topic: 'Private Radon moderation logs and staff reports',
				reason: `Radon setup confirmed by ${actorId}`,
				permissionOverwrites: [
					{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
					{ id: me.id, allow: ['ViewChannel', 'SendMessages', 'EmbedLinks'] },
					{ id: actor.id, allow: ['ViewChannel', 'SendMessages'] },
					...[...new Set([...draft.modRoles, ...draft.adminRoles])].map((id) => ({
						id,
						allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
					}))
				]
			});
		}
		const logId = created?.id ?? (draft.log === 'existing' ? draft.logChannelId : '');
		const reportId = draft.reports === 'log' ? logId : draft.reports === 'existing' ? draft.reportChannelId : '';
		// MongoDB transactions prevent concurrent setup/configuration writers from silently
		// overwriting a reviewed snapshot, and keep role/report/custom-rule writes together.
		await prisma.$transaction(async (tx) => {
			if (!sameConfiguration(initial, await readConfiguration(tx, guild.id)))
				throw new Error('Configuration changed while setup was open. Run /setup again.');
			const data = { configured: true, modRoles: draft.modRoles, adminRoles: draft.adminRoles, modLogChannel: logId };
			await tx.guildSettings.upsert({ where: { id: guild.id }, create: { id: guild.id, ...data }, update: data });
			if (reportId)
				await tx.moderationReportSettings.upsert({
					where: { id: guild.id },
					create: { id: guild.id, channelId: reportId },
					update: { channelId: reportId }
				});
			else if (initial.reports) await tx.moderationReportSettings.delete({ where: { id: guild.id } });
			const flood = draft.protection.includes('flood') && (!initial.automod || initial.automod.floodMode === 'off');
			const raid = draft.protection.includes('raid') && (!initial.automod || initial.automod.raidMode === 'off');
			if (flood || raid) {
				// One shared alert channel serves all custom rules. Preserve it when already
				// configured so adding a new observer cannot reroute another enabled rule.
				const update = { ...(flood ? { floodMode: 'observe' } : {}), ...(raid ? { raidMode: 'observe' } : {}) };
				await tx.automodConfig.upsert({
					where: { id: guild.id },
					create: {
						id: guild.id,
						alertChannelId: logId,
						exemptRoleIds: [],
						exemptChannelIds: [],
						blockedDomains: [],
						allowedDomains: [],
						...update
					},
					update: { ...update, ...(!initial.automod?.alertChannelId ? { alertChannelId: logId } : {}) }
				});
			}
		});
		committed = true;
		autoModService.invalidate(guild.id);
		for (const selected of draft.protection.filter((p) => p === 'flood' || p === 'raid')) {
			const oldMode = selected === 'flood' ? initial.automod?.floodMode : initial.automod?.raidMode;
			notes.push(
				oldMode && oldMode !== 'off'
					? `${selected}: existing ${oldMode} mode kept unchanged.`
					: `${selected}: observation alerts enabled; no enforcement added.`
			);
		}
		for (const preset of draft.protection.filter((p): p is 'mentions' | 'spam' => p === 'mentions' || p === 'spam')) {
			try {
				const freshActor = await requireSetupAdmin(guild, prisma, actorId);
				if (!freshActor.permissions.has('ManageGuild')) throw new Error('Manage Server access was removed');
				const rules = await guild.autoModerationRules.fetch();
				if (rules.some((rule) => rule.creatorId === guild.client.user.id && rule.name === `Radon: ${preset}`)) {
					notes.push(`${preset}: existing Radon rule kept unchanged.`);
					continue;
				}
				await guild.autoModerationRules.create({
					...nativeRule({ preset, mode: 'observe', alertChannelId: logId, exemptRoles: [], exemptChannels: [] }),
					reason: `Radon setup confirmed by ${actorId}`
				});
				notes.push(`${preset}: observation alerts enabled; no messages blocked.`);
			} catch {
				notes.push(
					`${preset}: could not confirm creation. Check /automod status and Discord AutoMod before retrying; permissions or rule quotas may prevent it.`
				);
			}
		}
		return { notes, logId, reportId };
	} catch (error) {
		// Discord and MongoDB cannot share a transaction. Never delete an externally
		// created channel or retry an uncertain write: the DB commit may have succeeded.
		throw new Error(
			`${committed ? 'Settings saved, but completion could not be confirmed.' : 'Saving could not be confirmed.'} ${created ? `Created <#${created.id}>; it has been kept.` : ''} Check /setup view before trying again.`,
			{ cause: error }
		);
	}
}
