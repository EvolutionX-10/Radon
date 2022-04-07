import { Timestamp } from '#lib/structures';
import { color } from '#lib/utility';
import { blacklistDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Guild, TextChannel } from 'discord.js';
@ApplyOptions<Listener.Options>({
	event: Events.GuildDelete
})
export class UserListener extends Listener {
	public async run(guild: Guild) {
		await this.container.client.guilds.fetch();
		const isBlacklisted = await blacklistDB.findById(guild.id);
		if (isBlacklisted) return;
		const channel = (await this.container.client.channels.fetch('950646213504552960').catch(() => null)) as TextChannel;
		if (!channel) return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook.token) return;
		const createDate = new Timestamp(guild.createdTimestamp);
		const owner = await this.container.client.users.fetch(guild.ownerId);
		const description =
			`Guild name: ${guild.name} \`[${guild.id}]\`\n` +
			`Created at ${createDate.getLongDateTime()} (${createDate.getRelativeTime()})\n` +
			`Owner: ${owner} \`(${owner.id})\`\n` +
			`Total Members: ${guild.memberCount}\n` +
			`Partnered: \`${guild.partnered}\` │ Verified: \`${guild.verified}\`\n`;
		await webhook.send({
			username: 'Radon Leaves',
			avatarURL: this.container.client.user?.displayAvatarURL() ?? '',
			embeds: [
				{
					title: `Stats`,
					thumbnail: {
						url: guild.iconURL({ format: 'png', dynamic: true }) || ''
					},
					description,
					footer: {
						text: `${this.container.client.guilds.cache.size} guilds now!`
					},
					color: color.System,
					timestamp: Date.now()
				}
			],
			allowedMentions: {
				parse: ['users']
			}
		});
	}
}
