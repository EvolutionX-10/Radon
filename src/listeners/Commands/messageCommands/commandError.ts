import { ApplyOptions } from '@sapphire/decorators';
import { MessageCommandErrorPayload, Events, Listener, ListenerOptions, UserError } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
@ApplyOptions<ListenerOptions>({
	event: Events.MessageCommandError
})
export class UserListener extends Listener<typeof Events.MessageCommandError> {
	public override async run(error: UserError, { message }: MessageCommandErrorPayload) {
		if (error instanceof UserError) {
			if (!Reflect.get(Object(error.context), 'silent')) return send(message, error.message);
		}
		return undefined;
	}
}
