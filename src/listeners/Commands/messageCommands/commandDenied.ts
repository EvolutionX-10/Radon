import { ApplyOptions } from '@sapphire/decorators';
import { Listener, UserError, MessageCommandDeniedPayload, ListenerOptions, Events } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';

@ApplyOptions<ListenerOptions>({
	event: Events.MessageCommandDenied
})
export class UserListener extends Listener {
	public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
		if (Reflect.get(Object(error.context), 'silent')) return;

		return send(message, error.message);
	}
}
