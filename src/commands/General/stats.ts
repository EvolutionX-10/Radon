import { RadonGuildId, TestServerGuildIds } from '#constants';
import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { version as sapphireVersion } from '@sapphire/framework';
import { roundNumber } from '@sapphire/utilities';
import { ContainerBuilder, MessageFlags, version, bold, heading, HeadingLevel } from 'discord.js';
import { uptime } from 'node:os';
import { performanceMetrics } from '../../lib/utility/functions/metrics.js';

@ApplyOptions<RadonCommand.Options>({
	name: 'stats',
	description: 'Provides some stats about me',
	permissionLevel: PermissionLevels.BotOwner
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description),
			{
				guildIds: [...RadonGuildId, ...TestServerGuildIds]
			}
		);
	}

	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		return interaction.reply({
			components: [this.buildContainer()],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}

	private buildContainer() {
		const stats = this.buildStats();
		const container = new ContainerBuilder();

		for (const [section, entries] of Object.entries(stats)) {
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`${heading(section, HeadingLevel.Two)}\n` +
						Object.entries(entries)
							.map(([key, value]) => `- ${bold(key)}: ${value}`)
							.join('\n')
				)
			);
			if (section !== 'Misc') container.addSeparatorComponents((s) => s);
		}
		if (performanceMetrics.enabled) {
			const summaries = performanceMetrics
				.snapshot()
				.sort((a, b) => b.recentP95Ms - a.recentP95Ms)
				.slice(0, 5);
			container.addTextDisplayComponents((text) =>
				text.setContent(
					'## Performance\nProcess-local; counts and average since restart, p95 of up to 128 recent timings.\n' +
						(summaries.length
							? summaries
									.map(
										(s) =>
											`- ${s.name}: ${s.count} runs, ${s.failures} failures; avg ${s.averageMs.toFixed(1)}ms, p95 ${s.recentP95Ms.toFixed(1)}ms`
									)
									.join('\n')
							: 'No measurements yet.')
				)
			);
		}

		return container;
	}

	private buildStats() {
		const stats = this.generalStatistics;
		const uptime = this.uptimeStatistics;
		const usage = this.usageStatistics;
		const misc = this.miscStatistics;

		return {
			Statistics: {
				Users: stats.users.toString(),
				Servers: stats.guilds.toString(),
				Channels: stats.channels.toString(),
				'Discord.js': stats.version,
				'Node.js': stats.nodeJs,
				Framework: stats.sapphireVersion
			},
			Uptime: {
				Host: uptime.host,
				Total: uptime.total,
				Client: uptime.client
			},
			'Server Usage': {
				Heap: `${usage.ramUsed}MB (Total: ${usage.ramTotal}MB)`
			},
			Misc: {
				'Lines of code': misc.lines,
				Files: misc.files
			}
		};
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
		const { linesOfCode, numOfFiles } = this.container.utils.countlines('src');
		return {
			lines: `${linesOfCode}`,
			files: `${numOfFiles}`
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

interface StatsMisc {
	lines: string;
	files: string;
}
