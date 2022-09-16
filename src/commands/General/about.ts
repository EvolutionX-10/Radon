import { Color, Emojis } from '#constants';
import { Button, Embed, RadonCommand, Row, Timestamp } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { version as sapphireVersion } from '@sapphire/framework';
import { roundNumber } from '@sapphire/utilities';
import { version } from 'discord.js';
import { uptime } from 'node:os';

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
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
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
					),
			{ idHints: ['970217477126643752', '1019931911902208063'] }
		);
	}

	public buildEmbed() {
		const titles = {
			stats: 'Statistics',
			uptime: 'Uptime',
			serverUsage: 'Server Usage',
			misc: 'Misc'
		};
		const stats = this.generalStatistics;
		const uptime = this.uptimeStatistics;
		const usage = this.usageStatistics;
		const misc = this.miscStatistics;

		const fields = {
			stats: `• **Users**: ${stats.users}\n• **Servers**: ${stats.guilds}\n• **Channels**: ${stats.channels}\n• **Discord.js**: ${stats.version}\n• **Node.js**: ${stats.nodeJs}\n• **Framework**: ${stats.sapphireVersion}`,
			uptime: `• **Host**: ${uptime.host}\n• **Total**: ${uptime.total}\n• **Client**: ${uptime.client}`,
			serverUsage: `• **Heap**: ${usage.ramUsed}MB (Total: ${usage.ramTotal}MB)`,
			misc: `• **Lines of code**: ${misc.lines}\n• **Files**: ${misc.files}`
		};

		return new Embed()._color(Color.General)._fields(
			{
				name: titles.stats,
				value: fields.stats
			},
			{
				name: titles.uptime,
				value: fields.uptime
			},
			{
				name: titles.serverUsage,
				value: fields.serverUsage
			},
			{
				name: titles.misc,
				value: fields.misc
			}
		);
	}

	private async me(interaction: RadonCommand.ChatInputCommandInteraction) {
		const row = new Row();
		const stats = new Button() //
			._customId('stats')
			._label('Funny Numbers here')
			._emoji('<:eyesFlipped:260280968609398785>')
			._style('SECONDARY');
		const back = new Button() //
			._customId('back')
			._label("I'm confused, get me back")
			._emoji('<:pepeOhno:891375539019976744>')
			._style('SECONDARY');

		const invite = this.container.client.generateInvite({
			scopes: ['applications.commands', 'bot'],
			permissions: 543276137727n
		});
		const inviteRow = new Row() //
			._components(
				new Button()._label(`Add me to your server!`)._emoji('<:radon:959378366874664972>')._style('LINK')._url(invite),
				new Button()._label(`Join Support Server!`)._style('LINK')._emoji('🆘')._url(`https://discord.gg/YBFaDggpvt`)
			);

		const m = (await interaction.reply({
			embeds: [this.story()],
			components: [row._components(stats), voteRow, inviteRow],
			fetchReply: true
		})) as RadonCommand.Message;

		const collector = m.createMessageComponentCollector({
			time: this.container.utils.sec(15)
		});
		collector.on('collect', (i) => {
			switch (i.customId as Ids) {
				case 'back':
					collector.resetTimer();
					return i.update({
						embeds: [this.story()],
						components: [row._components(stats), voteRow, inviteRow]
					});
				case 'stats':
					collector.resetTimer();
					return i.update({
						embeds: [this.buildEmbed()],
						components: [row._components(back), voteRow, inviteRow]
					});
			}
		});

		collector.on('end', async () => {
			for (const button of m.components[0].components) {
				button.setDisabled();
			}

			await m.edit({ components: m.components });
		});
	}

	private story() {
		const embed = new Embed();
		embed.setTitle('About me!');
		embed._author({
			name: this.container.client.user!.tag
		});
		embed._color(Color.General);
		const str =
			"Hey there! I'm Radon, a *moderation* bot dedicated to make your server a better place.\n" +
			'The maxim of my developer behind this is to allow server owners and admins to __easily configure__ me according to their wish ' +
			'*without needing to leave discord*. Configuring a moderation bot has never been this easy! If you have any suggestions/feedback, ' +
			'please join the support server and let my developer know!\n\n' +
			'Please take a moment to vote/rate me using the buttons below, it really helps my developer';
		embed._description(str);
		embed._thumbnail(this.container.client.user!.displayAvatarURL());
		return embed;
	}

	private get generalStatistics(): StatsGeneral {
		const { client } = this.container;
		return {
			channels: client.channels.cache.size,
			guilds: client.guilds.cache.size,
			nodeJs: process.version,
			users: client.guilds.cache.reduce((acc, val) => acc + (val.memberCount ?? 0), 0),
			version: `v${version}`,
			sapphireVersion: `v${sapphireVersion}`
		};
	}

	private get uptimeStatistics(): StatsUptime {
		const now = Date.now();
		return {
			client: new Timestamp(now - this.container.client.uptime!).getRelativeTime(),
			host: new Timestamp(now - uptime() * 1000).getRelativeTime(),
			total: new Timestamp(roundNumber(now - process.uptime() * 1000)).getRelativeTime()
		};
	}

	private get usageStatistics(): StatsUsage {
		const usage = process.memoryUsage();
		return {
			ramTotal: `${(usage.heapTotal / 1048576).toFixed(2)}`,
			ramUsed: `${(usage.heapUsed / 1048576).toFixed(2)}`
		};
	}

	private get miscStatistics(): StatsMisc {
		const { linesOfCode, numOfFiles } = this.container.utils.countlines('dist');
		return {
			lines: `${linesOfCode}`,
			files: `${numOfFiles}`
		};
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

		let perms = this.container.utils.format(role.permissions.toArray());
		if (perms.includes('Administrator')) perms = ['Administrator'];

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
			._thumbnail(role.iconURL() ?? `https://singlecolorimage.com/get/${hex === '000000' ? '2f3136' : hex}/400x400`)
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
}

const vote_top = new Button() //
	._label('Vote on Top.gg')
	._style('LINK')
	._emoji('<:topgg:918280202398875758>')
	._url('https://top.gg/bot/944833303226236989/vote');
const vote_void = new Button() //
	._label('Vote on Void Bots')
	._style('LINK')
	._emoji('<:voidbots:742925293907607624>')
	._url('https://voidbots.net/bot/944833303226236989/vote');
const vote_labs = new Button() //
	._label('Vote on Discord Labs')
	._style('LINK')
	._emoji('<:discordlabsicon:621472531735642130>')
	._url('https://bots.discordlabs.org/bot/944833303226236989?vote');
const vote_dbl = new Button() //
	._label('Vote on Discord Bot List')
	._style('LINK')
	._emoji('<:dbl:757235965629825084>')
	._url('https://discordbotlist.com/bots/radon-1595/upvote');

const votes = [vote_top, vote_void, vote_labs, vote_dbl];
export const voteRow = new Row()._components(votes);

interface StatsGeneral {
	channels: number;
	guilds: number;
	nodeJs: string;
	users: number;
	version: string;
	sapphireVersion: string;
}

interface StatsUptime {
	client: string;
	host: string;
	total: string;
}

interface StatsUsage {
	ramTotal: string;
	ramUsed: string;
}

interface StatsMisc {
	lines: string;
	files: string;
}

type Ids = 'back' | 'stats';

type SubCmd = 'me' | 'role';
