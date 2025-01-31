import { Timestamp } from '#lib/structures';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Identifiers, Listener, UserError, type ChatInputCommandDeniedPayload } from '@sapphire/framework';
import { MessageFlags, type CommandInteraction } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ChatInputCommandDenied
})
export class UserListener extends Listener {
	public run({ context, message: content, identifier }: UserError, { interaction }: ChatInputCommandDeniedPayload) {
		if (Reflect.get(Object(context), 'silent')) return;
		if (identifier === Identifiers.PreconditionCooldown) {
			const time = new Timestamp(Date.now() + (context as CooldownContext).remaining);
			return this.reply(interaction, `You are on cooldown. Try again ${time.getRelativeTime()}`);
		}
		return this.reply(interaction, content);
	}

	private async reply(interaction: CommandInteraction, content: string) {
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				content
			});
		}
		return interaction.reply({
			content,
			flags: MessageFlags.Ephemeral
		});
	}
}
interface CooldownContext {
	remaining: number;
}
