import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type InteractionHandlerError } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.InteractionHandlerError
})
export class UserListener extends Listener {
	public run(error: Error, payload: InteractionHandlerError) {
		console.log(error, payload);
	}
}
