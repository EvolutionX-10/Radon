import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ContextMenuCommandErrorPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ContextMenuCommandError
})
export class UserListener extends Listener {
	public run(error: Error, { command, interaction }: ContextMenuCommandErrorPayload) {
		console.log(error, command.name, interaction.user);
	}
}
