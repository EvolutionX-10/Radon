import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ChatInputCommandErrorPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ChatInputCommandError
})
export class UserListener extends Listener {
	public override async run(error: Error, { interaction }: ChatInputCommandErrorPayload) {
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				content: error.message
			});
		}
		return interaction.reply({
			content: error.message,
			ephemeral: true
		});
	}
}
