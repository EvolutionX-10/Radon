import { GuildMessage, RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.MessageCreate
})
export class UserListener extends Listener {
	public override async run(message: Message) {
		if (message.channel.type === 'DM') return;
		await this.slowmode(message as GuildMessage);
	}

	private async slowmode(message: GuildMessage) {
		const members = await this.container.db.smembers(message.guildId!);
		const channels = members.map((c) => c.split('|')[0]);
		const set = new Map<string, string>();
		members.forEach((c) => set.set(c.split('|')[0], c.split('|')[1]));
		if (set.has(message.channel.id)) {
			message.channel.slowModeSensitivity = set.get(message.channel.id)! as slowModeSensitivity;
		}
		if (!channels.includes(message.channel.id)) return;
		if (!message.channel.spam) message.channel.spam = [];
		let currentSlowMode = message.channel.rateLimitPerUser ?? 0;

		const slowModeSensitivity = {
			low: 50,
			medium: 30,
			high: 20
		};
		// ! slowmode immune people are ignored!
		if (message.member.permissions.has('MANAGE_MESSAGES') || message.member.permissions.has('MANAGE_CHANNELS')) return;
		// ! bots and webhooks are ignored
		if (message.author.bot || message.webhookId) return;
		if (message.channel.spam.length < slowModeSensitivity[message.channel.slowModeSensitivity]) {
			message.channel.spam.push(message);
		} else {
			message.channel.spam.length = 0;
			await message.channel.setRateLimitPerUser(++currentSlowMode);
			message.channel.spam.push(message);
		}
	}
}

declare module 'discord.js' {
	interface GuildChannel {
		spam: Message[];
		slowModeSensitivity: slowModeSensitivity;
	}
	interface ThreadChannel {
		spam: Message[];
		slowModeSensitivity: slowModeSensitivity;
	}
}

type slowModeSensitivity = 'low' | 'medium' | 'high';
