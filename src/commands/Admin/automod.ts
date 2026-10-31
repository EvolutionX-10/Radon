import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, GatewayIntentBits, InteractionContextType, MessageFlags, PermissionFlagsBits, type TextChannel } from 'discord.js';
import { nativeRule, parseDomains, parseIds, parseInviteCodes, type Mode, type NativePreset } from '../../lib/automod/rules.js';
import { autoModService } from '../../lib/automod/service.js';

@ApplyOptions<RadonCommand.Options>({
	name: 'automod',
	description: 'Configure automatic moderation and observe rules before enforcement',
	permissionLevel: PermissionLevels.Administrator,
	requiredClientPermissions: ['ManageGuild']
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.addSubcommand((sub) =>
					sub
						.setName('native')
						.setDescription('Configure a Discord keyword, mention, or spam preset')
						.addStringOption((o) =>
							o
								.setName('preset')
								.setDescription('Discord rule type')
								.setRequired(true)
								.addChoices(
									{ name: 'Keywords', value: 'keywords' },
									{ name: 'Mention spam', value: 'mentions' },
									{ name: 'Generic spam', value: 'spam' }
								)
						)
						.addStringOption((o) =>
							o
								.setName('mode')
								.setDescription('Observe logs only; enforce blocks matching messages')
								.setRequired(true)
								.addChoices(
									{ name: 'Observe', value: 'observe' },
									{ name: 'Enforce', value: 'enforce' },
									{ name: 'Off', value: 'off' }
								)
						)
						.addChannelOption((o) =>
							o
								.setName('alert_channel')
								.setDescription('Private staff alert channel; required when enabling')
								.addChannelTypes(ChannelType.GuildText)
						)
						.addStringOption((o) =>
							o.setName('keywords').setDescription('Comma-separated words or phrases; * wildcards allowed').setMaxLength(3000)
						)
						.addIntegerOption((o) =>
							o.setName('mention_limit').setDescription('Allowed unique mentions per message; default 5').setMinValue(1).setMaxValue(50)
						)
						.addStringOption((o) =>
							o.setName('exempt_roles').setDescription('Up to 20 role IDs separated by spaces or commas').setMaxLength(500)
						)
						.addStringOption((o) =>
							o.setName('exempt_channels').setDescription('Up to 50 channel IDs separated by spaces or commas').setMaxLength(1200)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('flood')
						.setDescription('Configure flood and duplicate-message detection (content opt-in required)')
						.addStringOption((o) =>
							o
								.setName('mode')
								.setDescription('Observe logs only; enforce deletes matching messages')
								.setRequired(true)
								.addChoices(
									{ name: 'Observe', value: 'observe' },
									{ name: 'Enforce', value: 'enforce' },
									{ name: 'Off', value: 'off' }
								)
						)
						.addChannelOption((o) =>
							o.setName('alert_channel').setDescription('Staff alerts; required on first setup').addChannelTypes(ChannelType.GuildText)
						)
						.addIntegerOption((o) =>
							o.setName('threshold').setDescription('Messages per member in the window; default 6').setMinValue(2).setMaxValue(100)
						)
						.addIntegerOption((o) =>
							o.setName('duplicates').setDescription('Repeated messages across any channels; default 3').setMinValue(2).setMaxValue(20)
						)
						.addIntegerOption((o) =>
							o.setName('window').setDescription('Rolling window in seconds; default 10').setMinValue(1).setMaxValue(60)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('links')
						.setDescription('Configure blocked domains and Discord invites (content opt-in required)')
						.addStringOption((o) =>
							o
								.setName('mode')
								.setDescription('Observe logs only; enforce deletes matching messages')
								.setRequired(true)
								.addChoices(
									{ name: 'Observe', value: 'observe' },
									{ name: 'Enforce', value: 'enforce' },
									{ name: 'Off', value: 'off' }
								)
						)
						.addChannelOption((o) =>
							o.setName('alert_channel').setDescription('Staff alerts; required on first setup').addChannelTypes(ChannelType.GuildText)
						)
						.addStringOption((o) =>
							o
								.setName('blocked_domains')
								.setDescription('Blocked domains, separated by spaces or commas; none to clear')
								.setMaxLength(2000)
						)
						.addStringOption((o) =>
							o
								.setName('allowed_domains')
								.setDescription('Exceptions override blocked domains/invites; none to clear')
								.setMaxLength(2000)
						)
						.addStringOption((o) =>
							o
								.setName('allowed_invites')
								.setDescription('Approved case-sensitive invite codes, separated by spaces/commas; none to clear')
								.setMaxLength(2000)
						)
						.addBooleanOption((o) => o.setName('block_invites').setDescription('Detect Discord invitation links'))
				)
				.addSubcommand((sub) =>
					sub
						.setName('raid')
						.setDescription('Detect join bursts; optionally raise verification temporarily (member opt-in required)')
						.addStringOption((o) =>
							o
								.setName('mode')
								.setDescription('Observe alerts only; enforce temporarily sets Highest verification')
								.setRequired(true)
								.addChoices(
									{ name: 'Observe', value: 'observe' },
									{ name: 'Enforce', value: 'enforce' },
									{ name: 'Off', value: 'off' }
								)
						)
						.addChannelOption((o) =>
							o.setName('alert_channel').setDescription('Staff alerts; required on first setup').addChannelTypes(ChannelType.GuildText)
						)
						.addIntegerOption((o) =>
							o.setName('threshold').setDescription('Joins needed to trigger; default 10').setMinValue(3).setMaxValue(100)
						)
						.addIntegerOption((o) =>
							o.setName('window').setDescription('Rolling window in seconds; default 10').setMinValue(1).setMaxValue(60)
						)
						.addIntegerOption((o) =>
							o
								.setName('duration')
								.setDescription('Verification restriction duration in seconds; default 600')
								.setMinValue(60)
								.setMaxValue(3600)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('exemptions')
						.setDescription('Replace custom-rule exemptions; native rules have their own exemptions')
						.addStringOption((o) =>
							o
								.setName('roles')
								.setDescription('Role IDs separated by spaces/commas; none to clear')
								.setRequired(true)
								.setMaxLength(500)
						)
						.addStringOption((o) =>
							o
								.setName('channels')
								.setDescription('Channel IDs separated by spaces/commas; none to clear')
								.setRequired(true)
								.setMaxLength(1200)
						)
				)
				.addSubcommand((sub) => sub.setName('status').setDescription('View native and custom rules and runtime prerequisites'))
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Delete a native preset created by this bot')
						.addStringOption((o) =>
							o
								.setName('preset')
								.setDescription('Preset to delete')
								.setRequired(true)
								.addChoices(
									{ name: 'Keywords', value: 'keywords' },
									{ name: 'Mention spam', value: 'mentions' },
									{ name: 'Generic spam', value: 'spam' }
								)
						)
				)
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild))
			return interaction.editReply('Manage Server is required to configure AutoMod.');
		try {
			const subcommand = interaction.options.getSubcommand(true);
			if (subcommand === 'native' || subcommand === 'remove') return await this.native(interaction, subcommand === 'remove');
			if (subcommand === 'status') return await this.status(interaction);
			return await this.custom(interaction, subcommand);
		} catch (error) {
			this.container.logger.error('AutoMod configuration failed', error);
			return interaction.editReply(
				'AutoMod configuration failed. No success was recorded. Check the bot permissions, rule limits, and database availability, then try again.'
			);
		}
	}

	private async ids(interaction: RadonCommand.ChatInputCommandInteraction, roles: string, channels: string) {
		let roleIds: string[];
		let channelIds: string[];
		try {
			roleIds = parseIds(roles === 'none' ? '' : roles, 20);
			channelIds = parseIds(channels === 'none' ? '' : channels, 50);
		} catch {
			return null;
		}
		for (const id of roleIds) if (!(await interaction.guild.roles.fetch(id))) return null;
		for (const id of channelIds) if (!(await interaction.guild.channels.fetch(id))) return null;
		return { roleIds, channelIds };
	}

	private async alertChannel(interaction: RadonCommand.ChatInputCommandInteraction, existingId?: string) {
		const selected = interaction.options.getChannel('alert_channel');
		const channel = selected ?? (existingId ? await interaction.guild.channels.fetch(existingId) : null);
		if (!channel || channel.type !== ChannelType.GuildText) return null;
		const text = channel as TextChannel;
		if (
			!text.permissionsFor(interaction.member).has(PermissionFlagsBits.ViewChannel) ||
			!text.permissionsFor(interaction.guild.members.me!).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])
		)
			return null;
		return text;
	}

	private async native(interaction: RadonCommand.ChatInputCommandInteraction, remove: boolean) {
		const preset = interaction.options.getString('preset', true) as NativePreset;
		const rules = await interaction.guild.autoModerationRules.fetch();
		const owned = rules.find((rule) => rule.name === `Radon: ${preset}` && rule.creatorId === interaction.client.user.id);
		if (remove) {
			if (!owned) return interaction.editReply('No matching native rule owned by this bot was found.');
			await owned.delete(`Requested by ${interaction.user.id}`);
			return interaction.editReply(`Removed the ${preset} preset.`);
		}
		const mode = interaction.options.getString('mode', true) as Mode;
		if (mode === 'off') {
			if (owned) await owned.setEnabled(false, `Requested by ${interaction.user.id}`);
			return interaction.editReply(`The ${preset} preset is off.`);
		}
		const channel = await this.alertChannel(interaction);
		if (!channel) return interaction.editReply('Choose an alert channel that both you and the bot can access and the bot can send messages to.');
		const exemptions = await this.ids(
			interaction,
			interaction.options.getString('exempt_roles') ?? [...(owned?.exemptRoles.keys() ?? [])].join(' '),
			interaction.options.getString('exempt_channels') ?? [...(owned?.exemptChannels.keys() ?? [])].join(' ')
		);
		if (!exemptions) return interaction.editReply('Exemptions must be valid IDs in this server: up to 20 roles and 50 channels.');
		let options;
		try {
			options = nativeRule({
				preset,
				mode,
				alertChannelId: channel.id,
				words: interaction.options.getString('keywords') ?? owned?.triggerMetadata.keywordFilter?.join(','),
				mentionLimit: interaction.options.getInteger('mention_limit') ?? owned?.triggerMetadata.mentionTotalLimit ?? undefined,
				exemptRoles: exemptions.roleIds,
				exemptChannels: exemptions.channelIds
			});
		} catch (error) {
			return interaction.editReply((error as Error).message);
		}
		options.reason = `Requested by ${interaction.user.id}`;
		const rule = owned ? await owned.edit(options) : await interaction.guild.autoModerationRules.create(options);
		return interaction.editReply({
			content: `${preset} preset ${rule.id}: ${mode}. ${mode === 'observe' ? 'Matching messages are reported without blocking.' : 'Matching messages are blocked and reported.'}`,
			allowedMentions: { parse: [] }
		});
	}

	private async custom(interaction: RadonCommand.ChatInputCommandInteraction, module: string) {
		const existing = await this.container.prisma.automodConfig.findUnique({ where: { id: interaction.guildId } });
		if (module === 'exemptions') {
			if (!existing) return interaction.editReply('Configure a flood, links, or raid rule first.');
			const ids = await this.ids(interaction, interaction.options.getString('roles', true), interaction.options.getString('channels', true));
			if (!ids) return interaction.editReply('Use valid role/channel IDs in this server, or none to clear them.');
			await this.container.prisma.automodConfig.update({
				where: { id: interaction.guildId },
				data: { exemptRoleIds: ids.roleIds, exemptChannelIds: ids.channelIds }
			});
			autoModService.invalidate(interaction.guildId);
			return interaction.editReply('Custom-rule exemptions updated. Staff with Manage Messages are also exempt from message rules.');
		}
		const mode = interaction.options.getString('mode', true) as Mode;
		if (!existing && mode === 'off') return interaction.editReply('This custom rule is already off.');
		const intent = module === 'raid' ? GatewayIntentBits.GuildMembers : GatewayIntentBits.MessageContent;
		if (mode !== 'off' && !interaction.client.options.intents.has(intent))
			return interaction.editReply(
				module === 'raid'
					? 'Join detection is disabled in this installation. Enable the Guild Members intent in the Developer Portal, set RADON_AUTOMOD_MEMBERS_ENABLED=true, and restart before enabling it.'
					: 'Custom message inspection is disabled in this installation. Enable the Message Content intent in the Developer Portal, set RADON_AUTOMOD_CONTENT_ENABLED=true, and restart before enabling it.'
			);
		const channel = mode === 'off' ? null : await this.alertChannel(interaction, existing?.alertChannelId);
		if (mode !== 'off' && !channel) return interaction.editReply('Choose an accessible alert channel with Send Messages permission for the bot.');
		if (mode === 'enforce' && module !== 'raid' && !interaction.guild.members.me!.permissions.has(PermissionFlagsBits.ManageMessages))
			return interaction.editReply('The bot needs Manage Messages to enforce message rules.');
		let domains: { blockedDomains?: string[]; allowedDomains?: string[]; allowedInviteCodes?: string[] } = {};
		if (module === 'links') {
			try {
				for (const [option, field] of [
					['blocked_domains', 'blockedDomains'],
					['allowed_domains', 'allowedDomains']
				] as const) {
					const value = interaction.options.getString(option);
					if (value !== null) domains[field] = parseDomains(value === 'none' ? '' : value);
				}
				const invites = interaction.options.getString('allowed_invites');
				if (invites !== null) domains.allowedInviteCodes = parseInviteCodes(invites === 'none' ? '' : invites);
			} catch {
				return interaction.editReply(
					'Enter up to 100 plain domains or case-sensitive invite codes separated by spaces/commas, or none to clear a list. URLs, paths, and wildcards are not accepted.'
				);
			}
		}
		const changes =
			module === 'flood'
				? {
						floodMode: mode,
						floodThreshold: interaction.options.getInteger('threshold') ?? existing?.floodThreshold ?? 6,
						duplicateThreshold: interaction.options.getInteger('duplicates') ?? existing?.duplicateThreshold ?? 3,
						windowSeconds: interaction.options.getInteger('window') ?? existing?.windowSeconds ?? 10
					}
				: module === 'links'
					? { linkMode: mode, ...domains, blockInvites: interaction.options.getBoolean('block_invites') ?? existing?.blockInvites ?? false }
					: {
							raidMode: mode,
							raidThreshold: interaction.options.getInteger('threshold') ?? existing?.raidThreshold ?? 10,
							raidWindowSeconds: interaction.options.getInteger('window') ?? existing?.raidWindowSeconds ?? 10,
							raidDurationSeconds: interaction.options.getInteger('duration') ?? existing?.raidDurationSeconds ?? 600
						};
		const data = { ...changes, ...(channel ? { alertChannelId: channel.id } : {}) };
		await this.container.prisma.automodConfig.upsert({
			where: { id: interaction.guildId },
			update: data,
			create: {
				id: interaction.guildId,
				alertChannelId: channel?.id ?? existing!.alertChannelId,
				exemptRoleIds: [],
				exemptChannelIds: [],
				blockedDomains: [],
				allowedDomains: [],
				allowedInviteCodes: [],
				raidRestoreAt: null,
				raidRestoreLevel: null,
				...data
			}
		});
		autoModService.invalidate(interaction.guildId);
		if (module === 'raid' && mode !== 'enforce') await autoModService.restoreRaid(this.container.prisma, interaction.guild, true);
		return interaction.editReply(
			`${module}: ${mode}. ${mode === 'observe' ? 'Only staff alerts will be sent.' : mode === 'enforce' ? (module === 'raid' ? 'Join bursts temporarily raise verification to Highest; existing role holders are unaffected.' : 'Matching messages will be deleted and reported.') : 'Automatic handling is disabled.'}${module === 'raid' && mode !== 'enforce' ? ' Any in-flight restriction is queued for restoration; check /automod status.' : ''}`
		);
	}

	private async status(interaction: RadonCommand.ChatInputCommandInteraction) {
		const [rules, config] = await Promise.all([
			interaction.guild.autoModerationRules.fetch(),
			this.container.prisma.automodConfig.findUnique({ where: { id: interaction.guildId } })
		]);
		const native = rules.filter((rule) => rule.creatorId === interaction.client.user.id && rule.name.startsWith('Radon: '));
		return interaction.editReply({
			content: [
				'Native rules:',
				...native.map((rule) => `${rule.name}: ${rule.enabled ? 'enabled' : 'off'} (${rule.id})`),
				...(native.size ? [] : ['None.']),
				`Custom flood: ${config?.floodMode ?? 'off'}; links: ${config?.linkMode ?? 'off'}; raid: ${config?.raidMode ?? 'off'}.`,
				`Content inspection available: ${interaction.client.options.intents.has(GatewayIntentBits.MessageContent)}. Join events available: ${interaction.client.options.intents.has(GatewayIntentBits.GuildMembers)}.`,
				...(config
					? [
							`Alerts: ${config.alertChannelId}. Flood: ${config.floodThreshold} messages / ${config.windowSeconds}s, ${config.duplicateThreshold} duplicates.`,
							`Blocked domains: ${config.blockedDomains.join(', ') || 'none'}. Allowed domains: ${config.allowedDomains.join(', ') || 'none'}. Block invites: ${config.blockInvites}.`,
							`Approved invite codes: ${config.allowedInviteCodes.join(', ') || 'none'}.`,
							`Exempt role IDs: ${config.exemptRoleIds.join(', ') || 'none'}. Exempt channel IDs: ${config.exemptChannelIds.join(', ') || 'none'}.`,
							`Raid: ${config.raidThreshold} joins / ${config.raidWindowSeconds}s, restriction ${config.raidDurationSeconds}s.`,
							...(config.raidRestoreAt ? [`Pending verification restoration: ${config.raidRestoreAt.toISOString()}.`] : [])
						]
					: [])
			]
				.join('\n')
				.slice(0, 2000),
			allowedMentions: { parse: [] }
		});
	}
}
