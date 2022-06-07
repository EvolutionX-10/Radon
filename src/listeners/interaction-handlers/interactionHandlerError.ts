import type { RadonEvents } from '#lib/types';
import { Listener, type InteractionHandlerError } from '@sapphire/framework';

export class UserListener extends Listener<typeof RadonEvents.InteractionHandlerError> {
	public run(error: Error, payload: InteractionHandlerError) {
		console.log(error, payload);
	}
}
