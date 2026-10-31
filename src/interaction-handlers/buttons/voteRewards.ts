import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { supporterUntil, voteService } from '../../lib/rewards/service.js';
import { rewardButtons, rewardSummary } from '../../lib/rewards/presentation.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.Button })
export class ButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		return interaction.customId === 'rewards:check' ? this.some() : this.none();
	}
	public override async run(interaction: ButtonInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			const checks = await voteService(this.container.prisma, interaction.client.user.id).check(interaction.user.id);
			return interaction.editReply({
				content: rewardSummary(await supporterUntil(this.container.prisma, interaction.user.id), checks),
				components: [rewardButtons()],
				allowedMentions: { parse: [] }
			});
		} catch {
			return interaction.editReply(
				'Please wait 30 seconds between checks. If verification is unavailable, your existing perks stay active; try again shortly.'
			);
		}
	}
}
