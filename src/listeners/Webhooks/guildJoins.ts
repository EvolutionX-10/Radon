import { GuildSettings, Timestamp } from '#lib/structures';
import { RadonEvents } from '#lib/types';
import { format } from '#lib/utility';
import { Color } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { Guild, TextChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.GuildCreate
})
export class UserListener extends Listener {
	public override async run(guild: Guild) {
		const isBlacklisted = await this.container.prisma.blacklist.findUnique({
			where: { id: guild.id }
		});
		if (isBlacklisted) {
			await guild.leave();
			return;
		}
		await guild.members.fetch();
		const bots = guild.members.cache.filter((m) => m.user.bot).size;
		const humans = guild.members.cache.filter((m) => !m.user.bot).size;

		guild.settings = new GuildSettings(guild, this.container.prisma);
		await this.container.client.guilds.fetch();
		const channel = (await this.container.client.channels.fetch('950646167715328000').catch(() => null)) as TextChannel;
		if (!channel) return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook.token) return;
		const createDate = new Timestamp(guild.createdTimestamp);
		const owner = await this.container.client.users.fetch(guild.ownerId);
		const me = guild.me ?? (await guild.members.fetch(this.container.client.user!.id));

		let perms = format(me.permissions.toArray());
		if (perms.includes('Administrator')) perms = ['Administrator'];

		const description =
			`Guild name: ${guild.name} \`[${guild.id}]\`\n` +
			`Created at ${createDate.getLongDateTime()} (${createDate.getRelativeTime()})\n` +
			`Owner: ${owner} \`(${owner.id})\` [${owner.tag}]\n` +
			`Total Members: ${guild.memberCount}\n` +
			`Bots: ${bots}\n` +
			`Users: ${humans}\n` +
			`Channels: ${guild.channels.cache.size}\n` +
			`Roles: ${guild.roles.cache.size}\n` +
			`Partnered: \`${guild.partnered}\` │ Verified: \`${guild.verified}\`\n` +
			`Permissions: ${perms.map((p) => `\`${p}\``).join('|') || 'No key permissions!'}`;

		await webhook.send({
			username: 'Radon Joins',
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
					color: Color.System,
					timestamp: Date.now()
				}
			]
		});
	}
}
