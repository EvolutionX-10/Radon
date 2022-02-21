import type { RadonClient } from '#lib/RadonClient';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
@ApplyOptions<Listener.Options>({
    event: Events.ClientReady,
    once: true,
})
export class UserListener extends Listener {
    public override async run(client: RadonClient) {
        this.container.client = client;
        this.container.logger.info(`Client ready!`);
    }
}
