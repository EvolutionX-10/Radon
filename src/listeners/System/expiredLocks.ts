import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import type { RadonClient } from '../../lib/RadonClient.js';
import { createLockExpiryWorker } from '../../lib/locks/scheduler.js';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady, once: true })
export class ExpiredLocksListener extends Listener {
	public override run(client: RadonClient) {
		const worker = createLockExpiryWorker(client, this.container.prisma, (error) =>
			this.container.logger.error('Temporary lock restoration failed:', error)
		);
		void worker.run();
		const timer = setInterval(() => {
			if (client.isReady()) void worker.run();
		}, 30_000);
		timer.unref();
		client.once(Events.Invalidated, () => clearInterval(timer));
	}
}
