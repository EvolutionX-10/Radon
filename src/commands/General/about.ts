import { Color, GuildIds } from '#constants';
import { Button, Embed, RadonCommand, Row, Timestamp } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { version as sapphireVersion } from '@sapphire/framework';
import { roundNumber } from '@sapphire/utilities';
import { version } from 'discord.js';
import { uptime } from 'node:os';

@ApplyOptions<RadonCommand.Options>({
	description: 'About me!'
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();

		switch (subcmd as SubCmd) {
			case 'me':
				return this.me(interaction);
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
					),
			{
				guildIds: GuildIds,
				idHints: ['970217477126643752', '969450739757883433']
			}
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
		embed._fields({
			name: 'Notice',
			value:
				`Radon is going through a rewrite and a big refactor,` +
				`and will need your support and belief to continue,` +
				`the release for v2.0 is nearing, there are new and exciting features to tell.\n` +
				`Some of them being... wait, I'll tell them when my dev is near to finishing it. Can't spoil it for you now 😜\n` +
				`To know more about it and help my developer by ideas or the code itself, please join support server using the button and contact them 🤗`
		});
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

type SubCmd = 'me';
