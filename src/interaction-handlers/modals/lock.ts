import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { completeLockPrompt } from '../../lib/locks/interaction.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.ModalSubmit })
export class ModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		return interaction.customId.startsWith('radon-lock:lock:') || interaction.customId.startsWith('@lock/') ? this.some() : this.none();
	}
	public override run(interaction: ModalSubmitInteraction) {
		return completeLockPrompt(interaction, this.container.prisma);
	}
}
