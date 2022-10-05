import { Owners, Prefixes } from '#constants';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady,
	once: true
})
export class UserListener extends Listener {
	public override run() {
		this.container.client.fetchPrefix = (message: Message) => {
			if (!message.guild) {
				if (Owners.includes(message.author.id)) {
					return Prefixes;
				}
				return null;
			}
			if (Owners.includes(message.author.id)) {
				return Prefixes;
			}
			return null;
		};
	}
}
