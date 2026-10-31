import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { saveMemberCode } from '../../lib/redemption/persistence.js';
import { parseClaimButton } from '../../lib/redemption/posts.js';
import { runClaims } from '../../lib/redemption/runtime.js';
import { makeNetmarbleAdapter, RedemptionError } from '../../lib/redemption/service.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.ModalSubmit })
export class ModalHandler extends InteractionHandler {
	public override async run(interaction: ModalSubmitInteraction, { memberCode, code, expired }: InteractionHandler.ParseResult<this>) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			if (expired) return interaction.editReply('This coupon post has expired. Your account was not saved.');
			if (!makeNetmarbleAdapter().validateAccount(memberCode))
				return interaction.editReply('Copy your 30–36 character member code from the game account settings.');
			await saveMemberCode(this.container.prisma, interaction.user.id, memberCode);
			return runClaims(interaction, code, [memberCode]);
		} catch (error) {
			return interaction.editReply(error instanceof RedemptionError ? error.message : 'Your account could not be saved. Please try again.');
		}
	}
	public override parse(interaction: ModalSubmitInteraction) {
		if (!interaction.customId.startsWith('claim-set-modal/')) return this.none();
		const parts = interaction.customId.split('/');
		const parsed =
			parts.length === 2
				? parseClaimButton(`code-${parts[1]}`)
				: parts.length === 3
					? parseClaimButton(`redeem:${parts[1]}:${parts[2]}`)
					: null;
		if (!parsed) return this.none();
		return this.some({ ...parsed, memberCode: interaction.fields.getTextInputValue('memberCodeInput').trim() });
	}
}
