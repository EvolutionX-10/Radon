import { Color, Emojis, UserFlags, voteRow } from '#constants';
import { Button, Embed, RadonCommand, Row, Timestamp } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { story } from '#lib/messages';
import { isOwner } from '#lib/utility';

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
					),
			{ idHints: ['970217477126643752', '1019931911902208063'] }
		);
	}

	private async me(interaction: RadonCommand.ChatInputCommandInteraction) {
		const invite = this.container.client.generateInvite({
			scopes: ['applications.commands', 'bot'],
			permissions: 543276137727n
		});
		const inviteRow = new Row() //
			._components(
				new Button()._label(`Add me to your server!`)._emoji('<:radon:959378366874664972>')._style('LINK')._url(invite),
				new Button()._label(`Join Support Server!`)._style('LINK')._emoji('🆘')._url(`https://discord.gg/YBFaDggpvt`)
			);

		await interaction.reply({
			embeds: [this.storyEmbed()],
			components: [voteRow, inviteRow]
		});
	}

	private storyEmbed() {
		return new Embed()
			._title('About me!')
			._author({
				name: this.container.client.user!.tag
			})
			._color(Color.General)
			._description(story)
			._thumbnail(this.container.client.user!.displayAvatarURL());
	}

	private role(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true);
		const date = new Timestamp(role.createdTimestamp);

		const basic =
			`\` - \` Rank: ${interaction.guild.roles.cache.size - role.position}\n` +
			`\` - \` Created At ${date.getShortDate()} [${date.getRelativeTime()}]\n` +
			`\` - \` Hex: *\`${role.hexColor}\`*\n` +
			`\` - \` Hoisted: ${role.hoist ? Emojis.Confirm : Emojis.Cross}\n` +
			`\` - \` Restricted to Bot: ${role.tags?.botId ? `${Emojis.Confirm} [<@${role.tags?.botId}>]` : Emojis.Cross}\n` +
			`\` - \` Mentionable: ${role.mentionable ? Emojis.Confirm : Emojis.Cross}\n` +
			`\` - \` Managed externally: ${role.managed ? Emojis.Confirm : Emojis.Cross}`;

		const perms = this.container.utils.format(role.permissions.toArray());

		const adv = `\` - \` ID: *\`${role.id}\`*\n\` - \` Members: ${role.members.size}\n\` - \` Key Permission: ${
			perms.length ? perms[0] : 'None!'
		}\n`;
		const hex = role.hexColor.slice(1);
		const embed = this.container.utils
			.embed()
			._author({
				name: 'Role Information'
			})
			._color(hex === '000000' ? '#2f3136' : role.color)
			._description(role.toString())
			._timestamp()
			._thumbnail(role.iconURL({ size: 4096 }) ?? `https://singlecolorimage.com/get/${hex === '000000' ? '2f3136' : hex}/400x400`)
			._footer({
				text: `Requested by ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			._fields(
				{
					name: 'Basic Info',
					value: basic
				},
				{
					name: 'Advanced Info',
					value: adv
				}
			);

		return interaction.reply({ embeds: [embed] });
	}

	private async user(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply();
		const user = await interaction.options.getUser('user', true).fetch(true);
		const member = interaction.options.getMember('user');
		const pfp = member?.displayAvatarURL({ dynamic: true, size: 4096 }) ?? user.displayAvatarURL({ dynamic: true, size: 4096 });
		const banner = user.bannerURL({ dynamic: true, size: 4096 }) ?? '';
		const createdAt = new Timestamp(user.createdTimestamp);
		const guildJoinDate = member?.joinedTimestamp ? new Timestamp(member.joinedTimestamp) : null;
		const perm = member
			? member.id === member.guild.ownerId
				? 'Server Owner'
				: this.container.utils.format(member.permissions.toArray())[0]
			: null;

		const embed = new Embed() //
			._title(user.tag)
			._color(user.hexAccentColor ?? Color.General)
			._footer({
				text: `Requested by ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			._fields({
				name: 'Created At',
				value: `${createdAt.getLongDate()} [${createdAt.getRelativeTime()}]`,
				inline: true
			})
			._timestamp()
			._image(banner)
			._thumbnail(pfp);

		if (guildJoinDate)
			embed.addFields({ name: 'Joined At', value: `${guildJoinDate.getLongDate()} [${guildJoinDate.getRelativeTime()}]`, inline: true });

		const flags = await user.fetchFlags(true);
		let flagValue = flags
			.toArray()
			.map((f) => UserFlags[f])
			.join(' ')
			.trim();

		if (flagValue.length) {
			if (isOwner(user)) flagValue = `${Emojis.Owner} ${flagValue}`;
			flagValue.length > 230 ? embed._description(flagValue) : embed._title(user.tag.concat(` ${flagValue}`));
		}

		embed.addFields({ name: 'ID', value: `\`${user.id}\``, inline: false });

		if (member?.nickname) embed.addFields({ name: 'Nickname', value: member.nickname, inline: true });
		if (member) embed.addFields({ name: 'Key Permission', value: perm!, inline: true });

		return interaction.editReply({ embeds: [embed] });
	}
}

type SubCmd = 'me' | 'role' | 'user';
