import { Color, Emojis, RecommendedPermissions, UserFlags, voteRow } from '#constants';
import { Button, Embed, RadonCommand, Row, Timestamp } from '#lib/structures';
import { isOwner } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonBuilder, ButtonStyle, ChannelType, OAuth2Scopes } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'About things!'
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();

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
					.setDMPermission(false)
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

		const embed = new Embed()
			._title('About me!')
			._author({ name: this.container.client.user!.tag })
			._color(Color.General)
			._description("Hey there! I'm Radon, a *moderation* bot dedicated to make your server a better place.")
			._timestamp()
			._footer({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
			._thumbnail(this.container.client.user!.displayAvatarURL());

		return interaction.reply({
			embeds: [embed],
			components: [voteRow, inviteRow]
		});
	}

	private role(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true);
		const date = new Timestamp(role.createdTimestamp);

		let basic =
			`\` - \` Rank **${role.guild.roles.cache.size - role.position}**\n` +
			`\` - \` Created At ${date.getShortDate()} [${date.getRelativeTime()}]\n` +
			`\` - \` Hex *\`${role.hexColor}\`*\n` +
			`\` - \` Hoisted ${bool(role.hoist)}\n` +
			`\` - \` Restricted to Bot: ${role.tags?.botId ? `${Emojis.Confirm} [<@${role.tags?.botId}>]` : Emojis.Cross}\n` +
			`\` - \` Mentionable ${bool(role.mentionable)}\n` +
			`\` - \` Managed externally ${bool(role.managed)}`;

		basic = basic
			.split('\n')
			.filter((s) => !s.includes(Emojis.Cross))
			.join('\n');

		const perms = this.container.utils.format(role.permissions.toArray());

		const adv =
			`\` - \` ID: **\`${role.id}\`**\n` +
			`\` - \` Members: **${role.members.size}**\n` +
			`\` - \` Key Permission: ${perms.length ? perms[0] : 'None!'}\n`;

		const hex = role.hexColor.slice(1);

		const embed = new Embed()
			._author({ name: 'Role Information' })
			._color(hex === '000000' ? Color.Invisible : role.color)
			._description(role.toString())
			._timestamp()
			._thumbnail(role.iconURL({ size: 4096 }) ?? `https://singlecolorimage.com/get/${hex === '000000' ? '2f3136' : hex}/400x400`)
			._footer({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
			._fields([
				{ name: 'Basic Info', value: basic },
				{ name: 'Advanced Info', value: adv }
			]);

		return interaction.reply({ embeds: [embed] });
	}

	private async user(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply();
		await interaction.guild?.members.fetch();
		const user = await interaction.options.getUser('user', true).fetch(true);
		const member = await interaction.options.getMember('user')?.fetch(true);
		const pfp = member?.displayAvatarURL({ forceStatic: false, size: 4096 }) ?? user.displayAvatarURL({ forceStatic: false, size: 4096 });
		const banner = user.bannerURL({ forceStatic: false, size: 4096 }) ?? null;
		const createdAt = new Timestamp(user.createdTimestamp);
		const guildJoinDate = member?.joinedTimestamp ? new Timestamp(member.joinedTimestamp) : null;
		const perm = member
			? member.id === member.guild.ownerId
				? 'Server Owner'
				: this.container.utils.format(member.permissions.toArray(), false)[0]
			: null;

		const embed = new Embed() //
			._title(user.globalName ?? user.username)
			._color(user.hexAccentColor ?? Color.General)
			._footer({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
			._fields([
				{
					name: 'Created At',
					value: `${createdAt.getLongDate()} [${createdAt.getRelativeTime()}]`,
					inline: true
				}
			])
			._timestamp()
			._image(banner)
			._thumbnail(pfp);

		if (guildJoinDate)
			embed._field({ name: 'Joined At', value: `${guildJoinDate.getLongDate()} [${guildJoinDate.getRelativeTime()}]`, inline: true });

		const flags = await user.fetchFlags(true);
		let flagValue = flags
			.toArray()
			.map((f) => UserFlags[f])
			.join(' ')
			.trim();

		if (flagValue.length) {
			if (isOwner(user)) flagValue = `${Emojis.Owner} ${flagValue}`;
			flagValue.length > 230 ? embed._description(flagValue) : embed._title((user.globalName ?? user.username).concat(` ${flagValue}`));
		}

		embed._field({ name: 'ID', value: `\`${user.id}\``, inline: false });

		if (member?.nickname) embed._field({ name: 'Nickname', value: member.nickname, inline: true });
		if (perm) embed._field({ name: 'Key Permission', value: perm, inline: true });

		return interaction.editReply({ embeds: [embed] });
	}

	private async server(interaction: RadonCommand.ChatInputCommandInteraction) {
		const { guild } = interaction;
		if (!guild.available) return;

		const owner = await guild.fetchOwner();
		const icon = guild.iconURL({ forceStatic: false, size: 2048 });
		const banner = guild.bannerURL({ size: 4096 });
		const create = new Timestamp(guild.createdTimestamp);
		const members = await guild.members.fetch();
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
