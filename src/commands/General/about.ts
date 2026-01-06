import { Color, Emojis, RecommendedPermissions, UserFlags, voteRow } from '#constants';
import { Button, Embed, RadonCommand, Row, Timestamp } from '#lib/structures';
import { isOwner } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import {
	italic,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	heading,
	InteractionContextType,
	MessageFlags,
	OAuth2Scopes,
	subtext,
	HeadingLevel,
	bold,
	inlineCode
} from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'About things!'
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();
		// TODO: Defer the reply or fetch members only for relevant subcommands
		if (interaction.guild && interaction.guild.memberCount > interaction.guild.members.cache.size) {
			await interaction.guild.members.fetch(); // Fetch all members to ensure we have the latest data
		}

		switch (subcmd as SubCmd) {
			case 'me':
				return this.me(interaction);
			case 'role':
				return this.role(interaction);
			case 'user':
				return this.user(interaction);
			case 'server':
				return this.server(interaction);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.setContexts([InteractionContextType.Guild])
					.addSubcommand((builder) =>
						builder //
							.setName('me')
							.setDescription('Show info about me!')
					)
					.addSubcommand((builder) =>
						builder //
							.setName('role')
							.setDescription('Show info about a role')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to show info about')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('user')
							.setDescription('Show info about a user')
							.addUserOption((option) =>
								option //
									.setName('user')
									.setDescription('The user to show info about')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('server')
							.setDescription('Show info about server')
					),
			{ idHints: ['970217477126643752', '1019931911902208063'] }
		);
	}

	private me(interaction: RadonCommand.ChatInputCommandInteraction) {
		const invite = this.container.client.generateInvite({
			scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
			permissions: RecommendedPermissions
		});

		const inviteRow = new Row<ButtonBuilder>() //
			._components(
				new Button()._label(`Add me to your server!`)._style(ButtonStyle.Link)._emoji('<:radon:959378366874664972>')._url(invite),
				new Button()._label(`Join Support Server!`)._style(ButtonStyle.Link)._emoji('🆘')._url(`https://discord.gg/YBFaDggpvt`)
			);

		const textContent = `${heading('About me!')}\nHello ${interaction.user}!\nI am Radon, a ${italic('moderation')} bot dedicated to make your server a better place`;

		const container = new ContainerBuilder() //
			.addSectionComponents((section) =>
				section
					.addTextDisplayComponents((textDisplay) => textDisplay.setContent(textContent))
					.setThumbnailAccessory((thumbnail) =>
						thumbnail
							.setURL(interaction.guild.members.me?.displayAvatarURL() || this.container.client.user!.displayAvatarURL())
							.setDescription('Radon Avatar')
					)
			)
			.addSeparatorComponents((s) => s)
			.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`If you like using me, consider voting to help me grow and reach more servers!\n` +
						subtext('Your support means a lot and helps keep the bot running smoothly. Thank you!')
				)
			)
			.addActionRowComponents(voteRow)
			.addSeparatorComponents((s) => s)
			.addActionRowComponents(inviteRow);

		return interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	private role(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true);
		const date = new Timestamp(role.createdTimestamp);

		let basic =
			` -  Rank **${role.guild.roles.cache.size - role.position}**\n` +
			` -  Created At ${date.getShortDate()} [${date.getRelativeTime()}]\n` +
			` -  Hex *\`${role.hexColor}\`*\n` +
			` -  Hoisted ${bool(role.hoist)}\n` +
			` -  Restricted to Bot: ${role.tags?.botId ? `${Emojis.Confirm} [<@${role.tags?.botId}>]` : Emojis.Cross}\n` +
			` -  Mentionable ${bool(role.mentionable)}\n` +
			` -  Managed externally ${bool(role.managed)}`;

		basic = basic
			.split('\n')
			.filter((s) => !s.includes(Emojis.Cross))
			.join('\n');

		const perms = this.container.utils.format(role.permissions.toArray());

		const adv =
			` -  ID: **\`${role.id}\`**\n` + //
			` -  Members: **${role.members.size}**\n` + //
			` -  Key Permission: ${perms.length ? perms[0] : 'None!'}\n`;

		const hex = role.hexColor.slice(1);

		// Add members button if role has members
		const components = [];
		if (role.members.size > 0) {
			const membersButton = new Button()._customId(`role-members-${role.id}`)._label('View Members')._style(ButtonStyle.Secondary)._emoji('👥');

			const row = new Row<ButtonBuilder>()._components(membersButton);
			components.push(row);
		}

		const container = new ContainerBuilder() //
			.setAccentColor(role.colors.primaryColor)
			.addSectionComponents((section) =>
				section
					.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(heading(role.toString()) + '\n' + heading('Basic Info', HeadingLevel.Two) + '\n' + basic)
					)
					.setThumbnailAccessory((thumbnail) =>
						thumbnail
							.setURL(role.iconURL({ size: 4096 }) ?? `https://singlecolorimage.com/get/${hex === '000000' ? '2f3136' : hex}/400x400`)
							.setDescription('Role Icon')
					)
			)
			.addSeparatorComponents((s) => s)
			.addTextDisplayComponents((textDisplay) =>
				textDisplay //
					.setContent(heading('Advanced Info', HeadingLevel.Two) + '\n' + adv)
			)
			.addSeparatorComponents((s) => s)
			.addActionRowComponents(...components);

		return interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	private async user(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply();
		const user = await interaction.options.getUser('user', true).fetch(true);
		const member = await interaction.options.getMember('user')?.fetch(true);
		const pfp = member?.displayAvatarURL({ forceStatic: false, size: 4096 }) ?? user.displayAvatarURL({ forceStatic: false, size: 4096 });
		const banner = member?.bannerURL({ forceStatic: false, size: 4096 }) ?? user.bannerURL({ forceStatic: false, size: 4096 }) ?? null;
		const createdAt = new Timestamp(user.createdTimestamp);
		const guildJoinDate = member?.joinedTimestamp ? new Timestamp(member.joinedTimestamp) : null;
		const perm = member
			? member.id === member.guild.ownerId
				? 'Server Owner'
				: this.container.utils.format(member.permissions.toArray(), false)[0]
			: null;

		const flags = (await user.fetch(true)).flags;
		let flagBadges = '';
		if (flags) {
			let flagValue = flags
				.toArray()
				.map((f) => UserFlags[f])
				.join(' ')
				.trim();

			if (flagValue.length) {
				if (isOwner(user)) flagValue = `${Emojis.Owner} ${flagValue}`;
				flagBadges = subtext(flagValue);
			}
		}

		let basicInfo = [
			heading('Basic Info', HeadingLevel.Two),
			`- ${bold('Bot')}: ${bool(user.bot)}`,
			`- ${bold('Global Name')}: ${user.globalName ?? 'None'}`,
			`- ${bold('ID')}: \`${user.id}\``,
			`- ${bold('Created At')}: ${createdAt.getShortDate()} [${createdAt.getRelativeTime()}]`
		];

		basicInfo = basicInfo.filter((s) => !s.includes(Emojis.Cross) && !s.includes('None'));

		const container = new ContainerBuilder() //
			.setAccentColor(user.accentColor ?? Color.General)
			.addSectionComponents((section) =>
				section //
					.setThumbnailAccessory((thumbnail) => thumbnail.setURL(pfp).setDescription(`${user.username}'s Avatar`))
					.addTextDisplayComponents((textDisplay) => textDisplay.setContent(heading(inlineCode(user.username)) + '\n' + flagBadges))
					.addTextDisplayComponents((textDisplay) => textDisplay.setContent(basicInfo.join('\n')))
			);

		if (member) {
			let serverInfo = [
				heading('Server Info', HeadingLevel.Two),
				`- ${bold('Nickname')}: ${member.nickname ?? 'None'}`,
				`- ${bold('Roles')}: **${member.roles.cache.size - 1}** Role(s)`,
				`- ${bold('Joined At')}: ${guildJoinDate?.getShortDate()} [${guildJoinDate?.getRelativeTime()}]`
			];
			if (perm) serverInfo.push(`- ${bold('Key Permission')}: ${perm}`);

			serverInfo = serverInfo.filter((s) => !s.includes('None') && !s.includes(Emojis.Cross));

			container
				.addSeparatorComponents((s) => s)
				.addSectionComponents((section) =>
					section
						.addTextDisplayComponents((textDisplay) => textDisplay.setContent(serverInfo.join('\n')))
						.setButtonAccessory((button) =>
							button
								.setLabel('View Roles')
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(`user-roles-${user.id}`)
								.setEmoji({ name: '🏷️' })
						)
				);
		}

		if (banner) {
			container.addMediaGalleryComponents((gallery) =>
				gallery.addItems((item) => item.setURL(banner).setDescription(`${user.username}'s Banner`))
			);
		}

		return interaction.editReply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	private async server(interaction: RadonCommand.ChatInputCommandInteraction) {
		const { guild } = interaction;
		if (!guild.available) return;

		const owner = await guild.fetchOwner();
		const icon = guild.iconURL({ forceStatic: false, size: 2048 });
		const banner = guild.bannerURL({ size: 4096 });
		const create = new Timestamp(guild.createdTimestamp);
		const members = guild.members.cache;
		const humans = members.filter((m) => !m.user.bot);

		const member =
			`\` - \` ${Emojis.Member} **${humans.size}** Member(s)\n` + //
			`\` - \` ${Emojis.Bot} **${guild.memberCount - humans.size}** Bot(s)\n` + //
			`\` - \` ${Emojis.Owner} ${owner.user} [\`${owner.id}\`]`;

		const allChannels = guild.channels.cache;
		const category = allChannels.filter((c) => c.type === ChannelType.GuildCategory).size;
		const voice = allChannels.filter((c) => c.isVoiceBased()).size;
		const text = allChannels.filter((c) => c.isTextBased() && !c.isThread() && !c.isVoiceBased()).size;
		const threads = allChannels.filter((c) => c.isThread()).size;

		let channels =
			`\` - \` ${Emojis.TextChannel} **${text}** Text\n` + //
			`\` - \` ${Emojis.VoiceChannel} **${voice}** Voice\n` + //
			`\` - \` ${Emojis.CategoryChannel} **${category}** Category\n` + //
			`\` - \` ${Emojis.ThreadChannel} **${threads}** Thread\n`;

		channels = channels
			.split('\n')
			.filter((t) => !t.includes('**0**'))
			.join('\n');

		const roles = guild.roles.cache
			.filter((r) => !r.tags?.botId) //
			.sort((a, b) => b.position - a.position)
			.map((r) => r.toString());
		roles.pop();

		let misc =
			`\` - \` ID: **\`${guild.id}\`**\n` +
			`\` - \` Created at ${create.getShortDate()}\n` + //
			`\` - \` Partnered ${bool(guild.partnered)}\n` +
			`\` - \` Verified ${bool(guild.verified)}\n` +
			`\` - \` AFK Channel ${guild.afkChannel ?? '**0**'}\n` +
			`\` - \` Emojis: **${guild.emojis.cache.size}**\n` +
			`\` - \` Stickers: **${guild.stickers.cache.size}**\n` +
			`\` - \` Boosts: **${guild.premiumSubscriptionCount ?? Emojis.Cross}**\n` +
			`\` - \` Vanity: \`discord.gg/${guild.vanityURLCode ?? Emojis.Cross}\``;

		misc = misc
			.split('\n')
			.filter((s) => !s.includes(Emojis.Cross) && !s.includes('**0**'))
			.join('\n');

		const embed = new Embed()
			._color(Color.General)
			._title(`[${guild.nameAcronym}] ${guild.name}`)
			._thumbnail(icon)
			._timestamp()
			._image(banner)
			._description(guild.description)
			._footer({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
			._fields([
				{
					name: `Members [${guild.memberCount}]`,
					value: member,
					inline: true
				},
				{
					name: `Channels [${allChannels.size}]`,
					value: channels,
					inline: true
				}
			]);

		if (roles.length !== 0) {
			embed._field({
				name: `Roles [${roles.length}]`,
				value: roles
					.slice(0, 3)
					.join(', ')
					.concat(roles.length > 3 ? ` and **${roles.length - 3}** more...` : '')
			});
		}

		embed._field({ name: 'Misc', value: misc });

		return interaction.reply({ embeds: [embed] });
	}
}

type SubCmd = 'me' | 'role' | 'user' | 'server';

function bool(state: boolean) {
	return state ? Emojis.Confirm : Emojis.Cross;
}
