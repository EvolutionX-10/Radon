import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { RadonEvents } from '#lib/types';
import { TemporaryBans, startTemporaryBanWorker } from '../../lib/moderation/temporaryBans.js';

@ApplyOptions<Listener.Options>({ event: RadonEvents.ClientReady, once: true })
export class UserListener extends Listener {
	private worker?: TemporaryBans;
	public override run() {
		this.worker = startTemporaryBanWorker(this.container.prisma, this.container.client, (error) =>
			this.container.logger.error('Temporary ban worker error', error)
		);
	}
	public override onUnload() {
		this.worker?.stop();
	}
}
