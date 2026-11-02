import {
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	RoleSelectMenuBuilder,
	SectionBuilder,
	StringSelectMenuBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	type Guild,
	type ContainerBuilder
} from 'discord.js';
import { card, divider, text, safe } from '../presentation/components.js';
import type { Configuration, SetupDraft, Protection } from './configuration.js';

export const protectionNames: Record<Protection, string> = {
	mentions: 'Native mention alerts',
	spam: 'Native spam alerts',
	flood: 'Flood and duplicate alerts',
	raid: 'Join-burst alerts'
};
const button = (id: string, label: string, style = ButtonStyle.Secondary) =>
	new ButtonBuilder().setCustomId(`setup:${id}`).setLabel(label).setStyle(style);
export const roleList = (ids: readonly string[], guild?: Guild) =>
	ids.length
		? ids
				.slice(0, 25)
				.map((id) => (guild && !guild.roles.cache.has(id) ? `Missing role \`${id}\`` : `<@&${id}>`))
				.join(', ') + (ids.length > 25 ? ` … (${ids.length - 25} more saved roles)` : '')
		: 'None';
const channel = (id?: string) => (id ? `<#${id}>` : 'Not configured');
export function summary(draft: SetupDraft) {
	return (
		`**Moderators:** ${roleList(draft.modRoles)}\n**Additional administrators:** ${roleList(draft.adminRoles)}\n` +
		`**Moderation logs:** ${draft.log === 'create' ? 'Create private #radon-staff' : draft.log === 'existing' ? channel(draft.logChannelId) : 'Skipped'}\n` +
		`**Member reports:** ${draft.reports === 'log' ? 'Use the staff log channel' : draft.reports === 'existing' ? channel(draft.reportChannelId) : 'Skipped'}\n` +
		`**Protection:** ${draft.protection.map((p) => protectionNames[p]).join(', ') || 'Keep current settings'}`
	);
}
export function availableProtection(guild: Guild, canManage: boolean): Protection[] {
	if (!canManage || !guild.members.me?.permissions.has('ManageGuild')) return [];
	return [
		'mentions',
		'spam',
		...(guild.client.options.intents.has('MessageContent') ? ['flood'] : []),
		...(guild.client.options.intents.has('GuildMembers') ? ['raid'] : [])
	] as Protection[];
}

export function setupScreen(
	draft: SetupDraft,
	step: number,
	guild: Guild,
	canManage: boolean,
	notice?: string,
	closed = false,
	current?: Configuration
): ContainerBuilder {
	const titles = ['Staff roles', 'Logs and reports', 'Optional protection', 'Review and save'];
	const panel = card(`Set up Radon · ${titles[step]}`, `Step ${step + 1} of 4 · Your selections are private. Nothing changes until you save.`);
	if (step === 0) {
		const intro =
			'**Moderator roles**\nChoose the staff roles that can moderate with Radon. Server owners and members with Administrator or Manage Server already have access.';
		const avatar = guild.client.user.displayAvatarURL?.();
		if (avatar)
			panel.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(intro))
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar).setDescription('Radon'))
			);
		else text(panel, intro);
		const mods = new RoleSelectMenuBuilder()
			.setCustomId('setup:mods')
			.setPlaceholder('Choose moderator roles (optional)')
			.setMinValues(0)
			.setMaxValues(25);
		if (draft.modRoles.length <= 25) mods.setDefaultRoles(...draft.modRoles.filter((id) => guild.roles.cache.has(id)));
		panel.addActionRowComponents((row) => row.addComponents(mods));
		text(
			panel,
			'**Additional administrator roles — optional**\nThese roles can change Radon settings and also moderate. This does not grant Discord permissions. Leave empty to use Discord permission defaults.'
		);
		const admins = new RoleSelectMenuBuilder()
			.setCustomId('setup:admins')
			.setPlaceholder('Additional Radon administrators (optional)')
			.setMinValues(0)
			.setMaxValues(25);
		if (draft.adminRoles.length <= 25) admins.setDefaultRoles(...draft.adminRoles.filter((id) => guild.roles.cache.has(id)));
		panel.addActionRowComponents((row) => row.addComponents(admins));
	} else if (step === 1) {
		text(
			panel,
			'**Moderation logs**\nChoose an existing channel, create a private staff channel, or skip. Existing channel permissions are kept.'
		);
		const logs = new ChannelSelectMenuBuilder()
			.setCustomId('setup:logs')
			.setPlaceholder('Choose an existing log channel')
			.setChannelTypes(ChannelType.GuildText)
			.setMinValues(0)
			.setMaxValues(1);
		if (draft.log === 'existing' && guild.channels.cache.has(draft.logChannelId)) logs.setDefaultChannels(draft.logChannelId);
		panel.addActionRowComponents((row) => row.addComponents(logs));
		panel.addActionRowComponents((row) =>
			row.addComponents(
				button('new-log', 'Create private staff channel', draft.log === 'create' ? ButtonStyle.Primary : ButtonStyle.Secondary),
				button('skip-log', 'Skip moderation logs')
			)
		);
		text(
			panel,
			`**Member reports — optional**\nUse a staff channel hidden from @everyone. Check other role/member overwrites for access.\nCurrent choice: ${draft.reports === 'log' ? 'Use staff log' : draft.reports === 'existing' ? channel(draft.reportChannelId) : 'Skip reports'}`
		);
		const reports = new ChannelSelectMenuBuilder()
			.setCustomId('setup:reports')
			.setPlaceholder('Choose a private report channel')
			.setChannelTypes(ChannelType.GuildText)
			.setMinValues(0)
			.setMaxValues(1);
		if (draft.reports === 'existing' && guild.channels.cache.has(draft.reportChannelId)) reports.setDefaultChannels(draft.reportChannelId);
		panel.addActionRowComponents((row) => row.addComponents(reports));
		panel.addActionRowComponents((row) =>
			row.addComponents(
				button('reports-log', 'Use staff log for reports').setDisabled(draft.log === 'none'),
				button('skip-reports', 'Skip reports')
			)
		);
		text(
			panel,
			`**Log choice:** ${draft.log === 'create' ? 'Create private #radon-staff on save' : draft.log === 'existing' ? channel(draft.logChannelId) : 'Skip moderation logs'}`
		);
	} else if (step === 2) {
		text(
			panel,
			'Keep your current protection settings, or select optional **observation alerts**. Setup never turns on blocking, deletion, or verification restrictions. Existing active rules and native Radon rules stay unchanged.'
		);
		const choices = availableProtection(guild, canManage);
		if (choices.length) {
			panel.addActionRowComponents((row) =>
				row.addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('setup:protection')
						.setPlaceholder('Keep current settings, or choose alerts')
						.setMinValues(0)
						.setMaxValues(choices.length)
						.addOptions(choices.map((id) => ({ label: protectionNames[id], value: id, default: draft.protection.includes(id) })))
				)
			);
		} else text(panel, 'Protection setup needs you and Radon to have Manage Server. You can finish the rest of setup without it.');
		panel.addActionRowComponents((row) => row.addComponents(button('keep-protection', 'Keep current protection')));
		text(
			panel,
			`**Duplicate detection:** ${guild.client.options.intents.has('MessageContent') ? 'Available' : 'Unavailable in this installation'}\n**Join detection:** ${guild.client.options.intents.has('GuildMembers') ? 'Available' : 'Unavailable in this installation'}\nMissing intent access must be enabled by the bot operator. You can still use native AutoMod.`
		);
		text(
			panel,
			'Native alerts use the staff log channel. Custom observers keep their existing alert channel when one is already configured. Tune thresholds and exemptions with `/automod` after setup.'
		);
	} else {
		text(panel, summary(draft));
		divider(panel);
		text(
			panel,
			'**What will change**\nSave these staff roles and destinations. Create a channel only if selected. Add the selected observers without changing existing active protection. Existing channel permissions are never rewritten.'
		);
		text(panel, 'If a Discord operation fails after settings are saved, the result will tell you what still needs attention.');
	}
	if (step >= 2 && current?.automod)
		text(
			panel,
			`**Existing custom modes — kept when already active**\nFlood: ${safe(current.automod.floodMode)} · links: ${safe(current.automod.linkMode)} · joins: ${safe(current.automod.raidMode)}\nExisting custom alert channel: ${channel(current.automod.alertChannelId)}`
		);
	divider(panel);
	if (notice) text(panel, safe(notice, 500));
	if (!closed)
		panel.addActionRowComponents((row) =>
			row.addComponents(
				button('back', 'Back').setDisabled(step === 0),
				button(step === 3 ? 'save' : 'next', step === 3 ? 'Save configuration' : 'Continue', ButtonStyle.Success),
				button('cancel', 'Cancel')
			)
		);
	return panel;
}

export function configurationPages(current: Configuration, guild: Guild): ContainerBuilder[] {
	const staff = card(
		'Current configuration · Staff',
		current.settings?.configured ? 'Saved server configuration · read only' : 'Setup has not been completed.'
	);
	text(
		staff,
		`**Moderator roles**\n${roleList(current.settings?.modRoles ?? [], guild)}\n\n**Additional administrator roles**\n${roleList(current.settings?.adminRoles ?? [], guild)}`
	);
	text(
		staff,
		'Server owners and members with Administrator or Manage Server have native staff access. Configured Radon roles do not grant Discord permissions.'
	);
	const logs = card('Current configuration · Destinations');
	text(logs, `**Moderation logs:** ${channel(current.settings?.modLogChannel)}\n**Member reports:** ${channel(current.reports?.channelId)}`);
	text(
		logs,
		'Missing or inaccessible destinations are checked by `/doctor`. Viewing configuration never changes channels, permissions, or settings.'
	);
	const protection = card('Current configuration · Protection');
	const config = current.automod;
	text(
		protection,
		config
			? `**Flood / duplicates:** ${safe(config.floodMode)} · ${config.floodThreshold} messages or ${config.duplicateThreshold} repeats in ${config.windowSeconds}s\n**Links:** ${safe(config.linkMode)} · invite blocking ${config.blockInvites ? 'on' : 'off'}\n**Join bursts:** ${safe(config.raidMode)} · ${config.raidThreshold} joins in ${config.raidWindowSeconds}s · protection ${config.raidDurationSeconds}s\n**Custom alert channel:** ${channel(config.alertChannelId)}\n**Exempt roles:** ${config.exemptRoleIds.length}\n**Exempt channels:** ${config.exemptChannelIds.length}\n**Blocked domains:** ${config.blockedDomains.length} · **Allowed domains:** ${config.allowedDomains.length} · **Approved invites:** ${config.allowedInviteCodes.length}`
			: 'No custom AutoMod configuration. Custom rules are off.'
	);
	text(
		protection,
		'Use `/automod status` for native rule status and detailed custom rule lists. Native rules are managed by Discord separately from this saved configuration.'
	);
	for (const panel of [staff, logs, protection]) {
		divider(panel);
		text(panel, 'Change settings with `/setup`. Check readiness with `/doctor`.');
	}
	return [staff, logs, protection];
}
