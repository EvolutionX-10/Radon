import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { color } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { version as sapphireVersion } from '@sapphire/framework';
import { roundNumber } from '@sapphire/utilities';
import { MessageEmbed, version } from 'discord.js';
import { uptime } from 'node:os';

@ApplyOptions<RadonCommand.Options>({
    description: 'Provides some stats about me',
    permissionLevel: PermissionLevels.Everyone,
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        interaction: RadonCommand.ChatInputCommandInteraction
    ) {
        return interaction.reply({
            embeds: [this.buildEmbed()],
            ephemeral: true,
        });
    }

    public async registerApplicationCommands(registry: RadonCommand.Registry) {
        registry.registerChatInputCommand(
            {
                name: this.name,
                description: this.description,
            },
            {
                guildIds: vars.guildIds,
                idHints: ['950027999242256424', '951679298840965160'],
            }
        );
    }
    private buildEmbed() {
        const titles = {
            stats: 'Statistics',
            uptime: 'Uptime',
            serverUsage: 'Server Usage',
        };
        const stats = this.generalStatistics;
        const uptime = this.uptimeStatistics;
        const usage = this.usageStatistics;

        const fields = {
            stats: `• **Users**: ${stats.users}\n• **Guilds**: ${stats.guilds}\n• **Channels**: ${stats.channels}\n• **Discord.js**: ${stats.version}\n• **Node.js**: ${stats.nodeJs}\n• **Framework**: ${stats.sapphireVersion}`,
            uptime: `• **Host**: ${uptime.host}\n• **Total**: ${uptime.total}\n• **Client**: ${uptime.client}`,
            serverUsage: `**Heap**: ${usage.ramUsed}MB (Total: ${usage.ramTotal}MB)`,
        };

        return new MessageEmbed()
            .setColor(color.General)
            .addField(titles.stats, fields.stats)
            .addField(titles.uptime, fields.uptime)
            .addField(titles.serverUsage, fields.serverUsage);
    }

    private get generalStatistics(): StatsGeneral {
        const { client } = this.container;
        return {
            channels: client.channels.cache.size,
            guilds: client.guilds.cache.size,
            nodeJs: process.version,
            users: client.guilds.cache.reduce(
                (acc, val) => acc + (val.memberCount ?? 0),
                0
            ),
            version: `v${version}`,
            sapphireVersion: `v${sapphireVersion}`,
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
            total: new Timestamp(
                roundNumber(now - process.uptime() * 1000)
            ).getRelativeTime(),
        };
    }

    private get usageStatistics(): StatsUsage {
        const usage = process.memoryUsage();
        return {
            ramTotal: `${(usage.heapTotal / 1048576).toFixed(2)}`,
            ramUsed: `${(usage.heapUsed / 1048576).toFixed(2)}`,
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
