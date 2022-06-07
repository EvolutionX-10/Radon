import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady
})
export class UserListener extends Listener {
	public override run() {
		process.on('unhandledRejection', (reason, p) => {
			this.container.logger.warn(' [antiCrash] :: Unhandled Rejection/Catch');
			this.container.logger.error(reason, p);
		});
		process.on('uncaughtException', (err, origin) => {
			this.container.logger.warn(' [antiCrash] :: Uncaught Exception/Catch');
			this.container.logger.error(err, origin);
		});
		process.on('uncaughtExceptionMonitor', (err, origin) => {
			this.container.logger.warn(' [antiCrash] :: Uncaught Exception/Catch (MONITOR)');
			this.container.logger.error(err, origin);
		});
	}
}
