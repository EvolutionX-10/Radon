import { GuildMessage, RadonEvents } from '#lib/types';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { GuildBasedChannel, GuildChannel, Collection } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady
})
export class UserListener extends Listener {
	public run() {
		setInterval(() => {
			let channels = this.container.client.channels.cache.filter((c) => c.isText() && c.type !== 'DM') as Collection<string, GuildChannel>;
			channels = channels.filter((c) => Boolean((c as GuildBasedChannel).spam && (c as GuildBasedChannel).spam.length));
			channels.forEach((c) => {
				// @ts-ignore - this is a hack to get around the fact that the type of `c` is `GuildChannel`
				c.spam.forEach((m: GuildMessage) => {
					if (
						m.createdTimestamp + sec(slowModeSensitivity[m.channel.slowModeSensitivity]) < Date.now() &&
						m.channel.spam.length &&
						m.channel.rateLimitPerUser
					) {
						m.channel.spam.splice(m.channel.spam.indexOf(m), 1);
						m.channel.setRateLimitPerUser(--m.channel.rateLimitPerUser).catch(() => null);
					}
				});
			});
		}, 10_000);
	}
}

const slowModeSensitivity = {
	low: 300,
	medium: 150,
	high: 60
};
