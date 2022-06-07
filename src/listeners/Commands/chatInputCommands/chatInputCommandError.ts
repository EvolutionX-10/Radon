import type { RadonEvents } from '#lib/types';
import { Listener, type ChatInputCommandErrorPayload } from '@sapphire/framework';

export class UserListener extends Listener<typeof RadonEvents.ChatInputCommandError> {
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
