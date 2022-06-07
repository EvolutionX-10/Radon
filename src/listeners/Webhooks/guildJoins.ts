import { GuildSettings, Timestamp } from '#lib/structures';
import type { RadonEvents } from '#lib/types';
import { color } from '#lib/utility';
import { blacklistDB } from '#models';
import { Listener } from '@sapphire/framework';
import type { Guild, TextChannel } from 'discord.js';

export class UserListener extends Listener<typeof RadonEvents.GuildCreate> {
	public override async run(guild: Guild) {
		const isBlacklisted = await blacklistDB.findById(guild.id);
		if (isBlacklisted) {
			await guild.leave();
			return;
		}
		await guild.members.fetch();
		const bots = guild.members.cache.filter((m) => m.user.bot).size;
		const humans = guild.members.cache.filter((m) => !m.user.bot).size;

		guild.settings = new GuildSettings(guild);
		await this.container.client.guilds.fetch();
		const channel = (await this.container.client.channels.fetch('950646167715328000').catch(() => null)) as TextChannel;
		if (!channel) return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook.token) return;
		const createDate = new Timestamp(guild.createdTimestamp);
		const owner = await this.container.client.users.fetch(guild.ownerId);
		const me =
			guild.me ??
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			(await guild.members.fetch(this.container.client.user!.id));
		let perms = me.permissions
			.toArray()
			.map((e) =>
				e
					.split(`_`)
					.map((i) => i[0] + i.match(/\B(\w+)/)?.[1]?.toLowerCase())
					.join(` `)
			)
			.filter((f) => f.match(/mem|mana|min|men/gim))
			?.sort();
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
					color: color.System,
					timestamp: Date.now()
				}
			]
		});
	}
}
