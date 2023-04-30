import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type MessageCommandErrorPayload, UserError } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.MessageCommandError
})
export class UserListener extends Listener {
	public override async run(error: UserError, { message }: MessageCommandErrorPayload) {
		if (error instanceof UserError) {
			if (!Reflect.get(Object(error.context), 'silent')) return send(message, error.message);
		}
		return undefined;
	}
}
