import type { RadonEvents } from '#lib/types';
import { MessageCommandErrorPayload, Listener, UserError } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';

export class UserListener extends Listener<typeof RadonEvents.MessageCommandError> {
	public override async run(error: UserError, { message }: MessageCommandErrorPayload) {
		if (error instanceof UserError) {
			if (!Reflect.get(Object(error.context), 'silent')) return send(message, error.message);
		}
		return undefined;
	}
}
