import { v2 } from '../../../lib/presentation/components.js';
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
				.editReply(
					v2(
						{
							content: error.message
						},
						'Command failed'
					)
				)
				.catch(() => null);
		}
		return interaction
			.reply(
				v2(
					{
						content: error.message,
						flags: MessageFlags.Ephemeral
					},
					'Command failed'
				)
			)
			.catch(() => null);
	}
}
