import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, UserError, type ChatInputCommandErrorPayload } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ChatInputCommandError
})
export class UserListener extends Listener {
	public override async run(error: UserError, { interaction }: ChatInputCommandErrorPayload) {
		if (interaction.deferred || interaction.replied) {
			return interaction
				.editReply({
					content: error.message
				})
				.catch(() => null);
		}
		return interaction
			.reply({
				content: error.message,
				flags: MessageFlags.Ephemeral
			})
			.catch(() => null);
	}
}
