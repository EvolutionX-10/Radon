import { Emojis } from '#constants';
import { RadonEvents } from '#lib/types';
import { claimCoupon } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override async parse(interaction: ButtonInteraction) {
		// Check if the button ID starts with 'code-'
		if (!interaction.customId.startsWith('code-')) return this.none();

		const code = interaction.customId.slice(5); // Extract code after 'code-'
		return this.some({ code });
	}

	public override async run(interaction: ButtonInteraction, { code }: { code: string }) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Get member codes for this user
			const userData = await this.container.prisma.memberCodes.findUnique({
				where: { id: interaction.user.id }
			});

			if (!userData || userData.memberCodes.length === 0) {
				return interaction.editReply({
					content: `${Emojis.Cross} You don't have any member codes registered! Please use \`/claim set\` to register your member code first.`
				});
			}

			const memberCodes = userData.memberCodes;
			let successCount = 0;
			let failCount = 0;
			const failedDetails: string[] = [];

			// Claim coupon for each member code
			for (const memberCode of memberCodes) {
				const result = await claimCoupon(code, memberCode);
				this.container.client.emit(RadonEvents.CodeClaim, {
					...result,
					userTag: interaction.user.tag,
					avatarURL: interaction.user.displayAvatarURL()
				});

				if (result.success) {
					successCount++;
				} else {
					failCount++;
					failedDetails.push(`• \`${memberCode.slice(0, 4)}...${memberCode.slice(-4)}\`: ${result.message}`);
				}
			}

			// Build response message
			let content = '';

			// Only show success if there are successful claims
			if (successCount > 0) {
				content += `${Emojis.Confirm} Claimed in **${successCount}** account(s)\n`;
			}

			// Show failures
			if (failCount > 0) {
				if (successCount > 0) content += '\n';
				content += `${Emojis.Cross} Failed in **${failCount}** account(s)\n`;
				if (failedDetails.length > 0) {
					content += failedDetails.join('\n');
				}
			}

			return interaction.editReply({ content });
		} catch (error) {
			this.container.logger.error('Error claiming coupon via button:', error);
			return interaction.editReply({
				content: `${Emojis.Cross} An error occurred while claiming the coupon. Please try again later.`
			});
		}
	}
}
