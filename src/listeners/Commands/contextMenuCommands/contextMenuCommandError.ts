import type { RadonEvents } from '#lib/types';
import { Listener, type ContextMenuCommandErrorPayload } from '@sapphire/framework';

export class UserListener extends Listener<typeof RadonEvents.ContextMenuCommandError> {
	public run(error: Error, { command, interaction }: ContextMenuCommandErrorPayload) {
		console.log(error, command.name, interaction.user);
	}
}
