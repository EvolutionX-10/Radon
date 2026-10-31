import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GatewayIntentBits, type Message, type PartialMessage } from 'discord.js';
import { autoModService } from '../../lib/automod/service.js';

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate })
export class UserListener extends Listener {
	public override async run(_old: Message | PartialMessage, message: Message | PartialMessage) {
		if (message.partial || !this.container.client.options.intents.has(GatewayIntentBits.MessageContent)) return;
		try {
			await autoModService.message(this.container.prisma, message, true);
		} catch (error) {
			this.container.logger.error('AutoMod edited message processing failed', error);
		}
	}
}
