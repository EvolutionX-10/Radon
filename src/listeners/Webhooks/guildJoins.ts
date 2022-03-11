import { GuildSettings, Timestamp } from '#lib/structures';
import { color } from '#lib/utility';
import { blacklistDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Guild, TextChannel } from 'discord.js';
@ApplyOptions<Listener.Options>({
    event: Events.GuildCreate,
})
export class UserListener extends Listener {
    public async run(guild: Guild) {
        const isBlacklisted = await blacklistDB.findById(guild.id);
        if (isBlacklisted) {
            await guild.leave();
            return;
        }
        guild.settings = new GuildSettings(guild);
        await this.container.client.guilds.fetch();
        await guild.members.fetch();
        const channel = (await this.container.client.channels
            .fetch('950646167715328000')
            .catch(() => null)) as TextChannel;
        if (!channel) return;
        const webhook = (await channel.fetchWebhooks()).first();
        if (!webhook || !webhook.token) return;
        const createDate = new Timestamp(guild.createdTimestamp);
        const owner = await this.container.client.users.fetch(guild.ownerId);
        const me =
            guild.me ??
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            (await guild.members.fetch(this.container.client.user!.id));
        const description =
            `Guild name: ${guild.name} \`[${guild.id}]\`\n` +
            `Created at ${createDate.getLongDateTime()} (${createDate.getRelativeTime()})\n` +
            `Owner: ${owner} \`(${owner.id})\`\n` +
            `Total Members: ${guild.memberCount}\n` +
            `Bots: ${guild.members.cache.filter((m) => m.user.bot).size}\n` +
            `Users: ${guild.members.cache.filter((m) => !m.user.bot).size}\n` +
            `Channels: ${guild.channels.cache.size}\n` +
            `Roles: ${guild.roles.cache.size}\n` +
            `Partnered: \`${guild.partnered}\` │ Verified: \`${guild.verified}\`\n` +
            `Permissions: \`${me.permissions.bitfield}\``;
        await webhook.send({
            username: 'Radon Joins',
            avatarURL: this.container.client.user?.displayAvatarURL() ?? '',
            embeds: [
                {
                    title: `Stats`,
                    thumbnail: {
                        url:
                            guild.iconURL({ format: 'png', dynamic: true }) ||
                            '',
                    },
                    description,
                    footer: {
                        text: `${this.container.client.guilds.cache.size} guilds now!`,
                    },
                    color: color.System,
                    timestamp: Date.now(),
                },
            ],
            allowedMentions: {
                parse: ['users'],
            },
        });
    }
}
