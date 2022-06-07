import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, UserError, MessageCommandDeniedPayload } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.MessageCommandDenied
})
export class UserListener extends Listener {
	public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
		if (Reflect.get(Object(error.context), 'silent')) return;

		return send(message, error.message);
	}
}
