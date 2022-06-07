import type { RadonEvents } from '#lib/types';
import { Listener, UserError, MessageCommandDeniedPayload } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';

export class UserListener extends Listener<typeof RadonEvents.MessageCommandDenied> {
	public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
		if (Reflect.get(Object(error.context), 'silent')) return;

		return send(message, error.message);
	}
}
