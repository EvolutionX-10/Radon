import { v2 } from '../../lib/presentation/components.js';
import { RadonCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { supporterUntil, voteService } from '../../lib/rewards/service.js';
import { rewardButtons, rewardContainer } from '../../lib/rewards/presentation.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Vote optionally to unlock account slots and personal coupon alerts' })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setContexts(InteractionContextType.Guild)
		);
	}
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			const checks = await voteService(this.container.prisma, interaction.client.user.id).check(interaction.user.id);
			return interaction.editReply({
				components: [rewardContainer(await supporterUntil(this.container.prisma, interaction.user.id), checks)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { parse: [] }
			});
		} catch {
			return interaction.editReply(
				v2(
					{
						content:
							'Vote checks are temporarily unavailable or you checked within the last 30 seconds. Your existing perks stay active. You can still vote below and check again shortly.',
						components: [rewardButtons()]
					},
					'Supporter Pass'
				)
			);
		}
	}
}
