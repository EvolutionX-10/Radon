import { interactionFailureMetadata } from '../../lib/redemption/privacy.js';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type InteractionHandlerParseError } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.InteractionHandlerParseError
})
export class UserListener extends Listener {
	public run(error: Error, payload: InteractionHandlerParseError) {
		this.container.logger.error('Interaction handler failed', interactionFailureMetadata(error, payload));
	}
}
