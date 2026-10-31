import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GatewayIntentBits, type Message } from 'discord.js';
import { autoModService } from '../../lib/automod/service.js';

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class UserListener extends Listener {
	public override async run(message: Message) {
		if (!this.container.client.options.intents.has(GatewayIntentBits.MessageContent)) return;
		try {
			await autoModService.message(this.container.prisma, message);
		} catch (error) {
			this.container.logger.error('AutoMod message processing failed', error);
		}
	}
}
