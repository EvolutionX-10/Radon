import { Timestamp } from '#lib/structures';
import { Events, Identifiers, Listener, UserError, type ChatInputCommandDeniedPayload } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';

export class UserListener extends Listener<typeof Events.ChatInputCommandDenied> {
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
		} else
			return interaction.reply({
				content,
				ephemeral: true
			});
	}
}
type CooldownContext = {
	remaining: number;
};
