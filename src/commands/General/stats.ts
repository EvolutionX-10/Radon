import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { color } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { version as sapphireVersion } from '@sapphire/framework';
import { roundNumber } from '@sapphire/utilities';
import { version } from 'discord.js';
import { uptime } from 'node:os';

@ApplyOptions<RadonCommand.Options>({
	description: 'Provides some stats about me',
	permissionLevel: PermissionLevels.Everyone
})
export class UserCommand extends RadonCommand {
	public override messageRun(message: RadonCommand.Message) {
		return message.channel.send({
			embeds: [this.buildEmbed()]
		});
	}

	private buildEmbed() {
		const titles = {
			stats: 'Statistics',
			uptime: 'Uptime',
			serverUsage: 'Server Usage'
		};
		const stats = this.generalStatistics;
		const uptime = this.uptimeStatistics;
		const usage = this.usageStatistics;

		const fields = {
			stats: `• **Users**: ${stats.users}\n• **Guilds**: ${stats.guilds}\n• **Channels**: ${stats.channels}\n• **Discord.js**: ${stats.version}\n• **Node.js**: ${stats.nodeJs}\n• **Framework**: ${stats.sapphireVersion}`,
			uptime: `• **Host**: ${uptime.host}\n• **Total**: ${uptime.total}\n• **Client**: ${uptime.client}`,
			serverUsage: `**Heap**: ${usage.ramUsed}MB (Total: ${usage.ramTotal}MB)`
		};

		return this.container.utils.embed()._color(color.General)._fields(
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
			}
		);
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
			client: new Timestamp(
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				now - this.container.client.uptime!
			).getRelativeTime(),
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
}

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
