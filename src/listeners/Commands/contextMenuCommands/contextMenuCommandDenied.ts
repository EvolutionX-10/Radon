import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, UserError, type ContextMenuCommandDeniedPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ContextMenuCommandDenied
})
export class UserListener extends Listener {
	public run({ context, message: content }: UserError, { interaction }: ContextMenuCommandDeniedPayload) {
		if (Reflect.get(Object(context), 'silent')) return;

		return interaction.reply({
			content,
			ephemeral: true
		});
	}
}
