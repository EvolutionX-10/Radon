import type { RadonEvents } from '#lib/types';
import { Listener, type InteractionHandlerParseError } from '@sapphire/framework';

export class UserListener extends Listener<typeof RadonEvents.InteractionHandlerParseError> {
	public run(error: Error, payload: InteractionHandlerParseError) {
		console.log(error, payload);
	}
}
