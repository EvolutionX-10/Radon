import { Events, Listener, type InteractionHandlerParseError } from '@sapphire/framework';

export class UserListener extends Listener<typeof Events.InteractionHandlerParseError> {
	public run(error: Error, payload: InteractionHandlerParseError) {
		console.log(error, payload);
	}
}
