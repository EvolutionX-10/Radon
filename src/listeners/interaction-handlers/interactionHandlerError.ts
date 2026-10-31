import { interactionFailureMetadata } from '../../lib/redemption/privacy.js';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type InteractionHandlerError } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.InteractionHandlerError
})
export class UserListener extends Listener {
	public run(error: Error, payload: InteractionHandlerError) {
		this.container.logger.error('Interaction handler failed', interactionFailureMetadata(error, payload));
	}
}
