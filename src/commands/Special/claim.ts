import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { RegisterBehavior } from '@sapphire/framework';
import {
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	escapeMarkdown
} from 'discord.js';
import { accountOwnerKey, games, getGame } from '../../lib/redemption/games.js';
import { accountLimit, supporterUntil } from '../../lib/rewards/service.js';
import { subscribeCoupons } from '../../lib/rewards/alerts.js';
import type { SlashCommandStringOption } from 'discord.js';
import { canPostCoupon, claimButtonId } from '../../lib/redemption/posts.js';
import { deleteMemberCode, saveMemberCode } from '../../lib/redemption/persistence.js';
import { redemptionService, runClaims } from '../../lib/redemption/runtime.js';
import { makeNetmarbleAdapter, maskMemberCode, RedemptionError, receiptKey, validateCoupon } from '../../lib/redemption/service.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Claim game coupons; defaults to Solo Leveling: ARISE', cooldownDelay: sec(3) })
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			const game = getGame(interaction.options.getString('game') ?? 'sololv');
			const owner = accountOwnerKey(interaction.user.id, game.id);
			switch (interaction.options.getSubcommand(true)) {
				case 'set':
					return await this.set(interaction);
				case 'code': {
					const data = await this.container.prisma.memberCodes.findUnique({
						where: { id: accountOwnerKey(interaction.user.id, interaction.options.getString('game') ?? 'sololv') }
					});
					if (!data?.memberCodes.length) return interaction.editReply('Use `/claim set` to save your member code first.');
					return runClaims(interaction, interaction.options.getString('coupon_code', true), data.memberCodes, game.id);
				}
				case 'solo':
					return runClaims(
						interaction,
						interaction.options.getString('coupon_code', true),
						[interaction.options.getString('member_code', true)],
						game.id
					);
				case 'delete': {
					const remaining = await deleteMemberCode(this.container.prisma, owner, interaction.options.getString('member_code', true).trim());
					return interaction.editReply(`${Emojis.Confirm} Account deleted. You have ${remaining} saved accounts for ${game.name}.`);
				}
				case 'view':
					return await this.view(interaction);
				case 'post':
					return await this.post(interaction);
				case 'alerts': {
					const enabled = interaction.options.getBoolean('enabled', true);
					await subscribeCoupons(this.container.prisma, interaction.user.id, interaction.guildId!, game.id, enabled);
					const active = enabled && (await supporterUntil(this.container.prisma, interaction.user.id));
					return interaction.editReply(
						!enabled
							? `Alerts for ${game.name} in this server are off.`
							: `Subscribed to ${game.name} coupons posted by staff in this server. ${active ? 'Alerts are active; allow direct messages from this server.' : 'Alerts will start when you activate a Supporter Pass with /vote.'}`
					);
				}
				case 'policy':
					return await this.policy(interaction);
				default:
					return interaction.editReply('Unknown claim action.');
			}
		} catch (error) {
			if (!(error instanceof RedemptionError)) this.container.logger.error('Claim command could not complete.');
			return interaction.editReply(
				error instanceof RedemptionError ? error.message : 'This operation is temporarily unavailable. Please try again later.'
			);
		}
	}
	public override async canDiscoverRoute(interaction: RadonCommand.ChatInputCommandInteraction, route: string): Promise<boolean> {
		if (route === 'policy') return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
		if (route !== 'post') return true;
		try {
			const policy = await this.container.prisma.redemptionGuildPolicy.findUnique({ where: { id: interaction.guildId! } });
			return canPostCoupon(interaction.member, policy?.roleId);
		} catch {
			return false;
		}
	}

	public override async autocompleteRun(interaction: RadonCommand.AutoComplete) {
		const focus = interaction.options.getFocused(true);
		if (focus.name !== 'member_code') return interaction.respond([]);
		const data = await this.container.prisma.memberCodes.findUnique({
			where: { id: accountOwnerKey(interaction.user.id, interaction.options.getString('game') ?? 'sololv') }
		});
		const codes = data?.memberCodes ?? [];
		const owner = accountOwnerKey(interaction.user.id, interaction.options.getString('game') ?? 'sololv');
		const labels = await this.container.prisma.redemptionAccountLabel.findMany({
			where: { id: { in: codes.map((code) => receiptKey('label', owner, code)) } }
		});
		const choices = codes.map((code, index) => ({
			name: `${labels.find((label) => label.id === receiptKey('label', owner, code))?.name ?? `Account ${index + 1}`} · ${maskMemberCode(code)}`,
			value: code
		}));
		return interaction.respond(
			choices.filter((choice) => `${choice.name} ${choice.value}`.toLowerCase().includes(String(focus.value).toLowerCase())).slice(0, 25)
		);
	}
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.addSubcommand((sub) =>
						sub
							.setName('set')
							.setDescription('Save or name a game account (Solo Leveling by default)')
							.addStringOption((option) =>
								option
									.setName('member_code')
									.setDescription('Your game member code')
									.setRequired(true)
									.setMinLength(1)
									.setMaxLength(64)
							)
							.addStringOption((option) =>
								option.setName('name').setDescription('An optional account name, such as Main or Alt').setMaxLength(32)
							)
							.addStringOption(gameOption)
					)
					.addSubcommand((sub) =>
						sub
							.setName('code')
							.setDescription('Claim a coupon for your saved accounts')
							.addStringOption((option) =>
								option.setName('coupon_code').setDescription('The coupon code').setRequired(true).setMaxLength(64)
							)
							.addStringOption(gameOption)
					)
					.addSubcommand((sub) =>
						sub
							.setName('solo')
							.setDescription('Claim a coupon with a specific member code')
							.addStringOption((option) =>
								option
									.setName('member_code')
									.setDescription('Your game member code')
									.setRequired(true)
									.setAutocomplete(true)
									.setMinLength(1)
									.setMaxLength(64)
							)
							.addStringOption((option) =>
								option.setName('coupon_code').setDescription('The coupon code').setRequired(true).setMaxLength(64)
							)
							.addStringOption(gameOption)
					)
					.addSubcommand((sub) =>
						sub
							.setName('delete')
							.setDescription('Delete a saved member code')
							.addStringOption((option) =>
								option.setName('member_code').setDescription('The account to delete').setRequired(true).setAutocomplete(true)
							)
							.addStringOption(gameOption)
					)
					.addSubcommand((sub) => sub.setName('view').setDescription('View your saved accounts privately').addStringOption(gameOption))
					.addSubcommand((sub) =>
						sub
							.setName('post')
							.setDescription('Post a coupon for others to claim (staff only)')
							.addStringOption((option) => option.setName('code').setDescription('The coupon code').setRequired(true).setMaxLength(64))
							.addChannelOption((option) =>
								option
									.setName('channel')
									.setDescription('Where to post (defaults to this channel)')
									.addChannelTypes(ChannelType.GuildText)
							)
							.addIntegerOption((option) =>
								option
									.setName('expires_in')
									.setDescription('Disable redemption after this many minutes; use the published coupon expiry')
									.setMinValue(1)
									.setMaxValue(43_200)
							)
							.addStringOption(gameOption)
					)
					.addSubcommand((sub) =>
						sub
							.setName('alerts')
							.setDescription('Opt in or out of personal coupon alerts for this server')
							.addBooleanOption((option) =>
								option.setName('enabled').setDescription('Receive alerts while your Supporter Pass is active').setRequired(true)
							)
							.addStringOption(gameOption)
					)
					.addSubcommand((sub) =>
						sub
							.setName('policy')
							.setDescription('Configure coupon posting access (Manage Server required)')
							.addRoleOption((option) => option.setName('posting_role').setDescription('Allow this role to post coupons'))
							.addChannelOption((option) =>
								option
									.setName('posting_channel')
									.setDescription('Restrict coupon posts to this channel')
									.addChannelTypes(ChannelType.GuildText)
							)
							.addBooleanOption((option) =>
								option.setName('reset').setDescription('Restore staff-only posting in any accessible text channel')
							)
					),
			{ idHints: ['1458819699272978505', '1458818793659961516'], behaviorWhenNotIdentical: RegisterBehavior.Overwrite }
		);
	}
	private async set(interaction: RadonCommand.ChatInputCommandInteraction) {
		const memberCode = interaction.options.getString('member_code', true).trim();
		const game = getGame(interaction.options.getString('game') ?? 'sololv');
		const limit = await accountLimit(this.container.prisma, interaction.user.id);
		if (!makeNetmarbleAdapter(fetch, game.id).validateAccount(memberCode))
			throw new RedemptionError(`Copy your ${game.minLength}–${game.maxLength} character member code from the ${game.name} account settings.`);
		const count = await saveMemberCode(
			this.container.prisma,
			accountOwnerKey(interaction.user.id, game.id),
			memberCode,
			interaction.options.getString('name')?.trim() || undefined,
			limit
		);
		return interaction.editReply(`${Emojis.Confirm} Saved account. You have ${count}/${limit} saved accounts for ${game.name}.`);
	}
	private async view(interaction: RadonCommand.ChatInputCommandInteraction) {
		const data = await this.container.prisma.memberCodes.findUnique({
			where: { id: accountOwnerKey(interaction.user.id, interaction.options.getString('game') ?? 'sololv') }
		});
		if (!data?.memberCodes.length) return interaction.editReply('You have no saved accounts. Use `/claim set` to add one.');
		const owner = accountOwnerKey(interaction.user.id, interaction.options.getString('game') ?? 'sololv');
		const labels = await this.container.prisma.redemptionAccountLabel.findMany({
			where: { id: { in: data.memberCodes.map((code) => receiptKey('label', owner, code)) } }
		});
		const content = data.memberCodes
			.map(
				(code, index) =>
					`${index + 1}. **${escapeMarkdown(labels.find((label) => label.id === receiptKey('label', owner, code))?.name ?? `Account ${index + 1}`)}** · \`${maskMemberCode(code)}\``
			)
			.join('\n');
		return interaction.editReply({
			content: `Your ${getGame(interaction.options.getString('game') ?? 'sololv').name} accounts (${data.memberCodes.length} saved):\n${content}\nThe first ${await accountLimit(this.container.prisma, interaction.user.id)} are active for batch claims. Use /claim solo for a specific account.`,
			allowedMentions: { parse: [] }
		});
	}
	private async policy(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
			throw new RedemptionError('Manage Server permission is required to configure coupon posting.');
		if (interaction.options.getBoolean('reset')) {
			await this.container.prisma.redemptionGuildPolicy.deleteMany({ where: { id: interaction.guildId! } });
			return interaction.editReply('Coupon posting restored to members with Manage Messages, in accessible text channels.');
		}
		const role = interaction.options.getRole('posting_role');
		const channel = interaction.options.getChannel('posting_channel');
		if (!role && !channel) return interaction.editReply('Choose a posting role, a posting channel, or reset the policy.');
		await this.container.prisma.redemptionGuildPolicy.upsert({
			where: { id: interaction.guildId! },
			create: { id: interaction.guildId!, roleId: role?.id, channelId: channel?.id },
			update: { ...(role ? { roleId: role.id } : {}), ...(channel ? { channelId: channel.id } : {}) }
		});
		return interaction.editReply('Coupon posting policy saved. Staff with Manage Messages can also post in the configured channel.');
	}
	private async post(interaction: RadonCommand.ChatInputCommandInteraction) {
		const game = getGame(interaction.options.getString('game') ?? 'sololv');
		const code = interaction.options.getString('code', true).trim();
		if (!validateCoupon(code)) throw new RedemptionError('Enter a coupon containing 1–64 letters, numbers, underscores or hyphens.');
		const policy = await this.container.prisma.redemptionGuildPolicy.findUnique({ where: { id: interaction.guildId! } });
		if (!canPostCoupon(interaction.member, policy?.roleId))
			throw new RedemptionError('You need Manage Messages permission or the configured coupon posting role.');
		const targetId = interaction.options.getChannel('channel')?.id ?? interaction.channelId;
		if (policy?.channelId && policy.channelId !== targetId)
			throw new RedemptionError('Coupon posts are restricted to the configured posting channel.');
		const channel = await interaction.guild.channels.fetch(targetId);
		if (
			channel?.type !== ChannelType.GuildText ||
			!channel.permissionsFor(interaction.member).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])
		)
			throw new RedemptionError('Choose a text channel you can view and send messages in.');
		const minutes = interaction.options.getInteger('expires_in');
		const expiresAt = minutes ? Date.now() + minutes * 60_000 : 0;
		const saved = await this.container.prisma.memberCodes.findUnique({
			where: { id: accountOwnerKey(interaction.user.id, interaction.options.getString('game') ?? 'sololv') }
		});
		const preview = await redemptionService(this.container.prisma).preview(game.id, code, {
			memberCode: saved?.memberCodes[0] ?? 'EDC9B7A5D68B4F0B9E7293500507E850'
		});
		const container = new ContainerBuilder()
			.addTextDisplayComponents((text) =>
				text.setContent(`## ${game.name} coupon\n\`${code}\`${expiresAt ? `\nClaim before <t:${Math.floor(expiresAt / 1_000)}:F>.` : ''}`)
			)
			.addSectionComponents((section) =>
				section
					.addTextDisplayComponents((text) => text.setContent('Claim for your saved accounts. Results are private.'))
					.setButtonAccessory((button) =>
						button
							.setLabel('CLAIM')
							.setStyle(ButtonStyle.Success)
							.setCustomId(claimButtonId(game.id, code, expiresAt))
					)
			);

		if (preview) {
			if (preview.imageUrl)
				container.addSectionComponents((section) =>
					section
						.addTextDisplayComponents((text) => text.setContent(escapeMarkdown(preview.name)))
						.setThumbnailAccessory((thumbnail) => thumbnail.setURL(preview.imageUrl!))
				);
			else container.addTextDisplayComponents((text) => text.setContent(escapeMarkdown(preview.name)));
		} else {
			return interaction.editReply(
				`Coupon preview failed. The coupon may be invalid, expired, or the game service is temporarily unavailable.`
			);
		}
		container.addActionRowComponents((row) =>
			row.addComponents(new ButtonBuilder().setCustomId('guide:start').setStyle(ButtonStyle.Secondary).setLabel('How to claim'))
		);
		const message = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
		try {
			await this.container.prisma.couponAlert.create({
				data: {
					id: message.id,
					guildId: interaction.guildId!,
					channelId: channel.id,
					game: game.id,
					code,
					messageUrl: message.url,
					cursor: '',
					createdAt: new Date(),
					expiresAt: new Date(Math.min(expiresAt || Infinity, Date.now() + 24 * 60 * 60_000)),
					couponExpiresAt: expiresAt ? new Date(expiresAt) : null
				}
			});
		} catch {
			this.container.logger.warn('Coupon posted, but personal alerts could not be queued.');
		}
		return interaction.editReply(`${Emojis.Confirm} Posted coupon: ${message.url}`);
	}
}

function gameOption(option: SlashCommandStringOption) {
	return option
		.setName('game')
		.setDescription('Optional — Solo Leveling: ARISE when omitted')
		.addChoices(...games.map((game) => ({ name: game.name, value: game.id })));
}
