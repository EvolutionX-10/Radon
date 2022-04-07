import { Events, Listener, UserError, type ContextMenuCommandDeniedPayload } from '@sapphire/framework';

export class UserListener extends Listener<typeof Events.ContextMenuCommandDenied> {
	public run({ context, message: content }: UserError, { interaction }: ContextMenuCommandDeniedPayload) {
		if (Reflect.get(Object(context), 'silent')) return;

		return interaction.reply({
			content,
			ephemeral: true
		});
	}
}
