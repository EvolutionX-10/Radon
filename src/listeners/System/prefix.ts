import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { vars } from '#vars';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady,
	once: true
})
export class UserListener extends Listener {
	public override run() {
		this.container.client.fetchPrefix = (message: Message) => {
			if (!message.guild) {
				if (vars.owners.includes(message.author.id)) {
					return vars.owner_prefixes;
				}
				return null;
			}
			if (vars.owners.includes(message.author.id)) {
				return vars.owner_prefixes;
			}
			return null;
		};
	}
}
