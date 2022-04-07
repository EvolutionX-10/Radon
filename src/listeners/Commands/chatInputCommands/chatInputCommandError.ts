import { Events, Listener, type ChatInputCommandErrorPayload } from '@sapphire/framework';

export class UserListener extends Listener<typeof Events.ChatInputCommandError> {
	public async run(error: Error, { interaction }: ChatInputCommandErrorPayload) {
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				content: error.message
			});
		} else
			return interaction.reply({
				content: error.message,
				ephemeral: true
			});
	}
}
