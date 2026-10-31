import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { saveMemberCode } from '../../lib/redemption/persistence.js';
import { parseClaimButton } from '../../lib/redemption/posts.js';
import { runClaims } from '../../lib/redemption/runtime.js';
import { makeNetmarbleAdapter, RedemptionError } from '../../lib/redemption/service.js';
import { accountOwnerKey, getGame } from '../../lib/redemption/games.js';
import { accountLimit } from '../../lib/rewards/service.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.ModalSubmit })
export class ModalHandler extends InteractionHandler {
	public override async run(
		interaction: ModalSubmitInteraction,
		{ memberCode, code, expired, game: gameId = 'sololv' }: InteractionHandler.ParseResult<this>
	) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			if (expired) return interaction.editReply('This coupon post has expired. Your account was not saved.');
			const game = getGame(gameId);
			if (!makeNetmarbleAdapter(fetch, game.id).validateAccount(memberCode))
				return interaction.editReply(
					`Copy your ${game.minLength}–${game.maxLength} character member code from the ${game.name} account settings.`
				);
			await saveMemberCode(
				this.container.prisma,
				accountOwnerKey(interaction.user.id, game.id),
				memberCode,
				undefined,
				await accountLimit(this.container.prisma, interaction.user.id)
			);
			return runClaims(interaction, code, [memberCode], game.id);
		} catch (error) {
			return interaction.editReply(error instanceof RedemptionError ? error.message : 'Your account could not be saved. Please try again.');
		}
	}
	public override parse(interaction: ModalSubmitInteraction) {
		if (!interaction.customId.startsWith('claim-set-modal/') && !interaction.customId.startsWith('claim-game/')) return this.none();
		const parts = interaction.customId.split('/');
		const parsed = interaction.customId.startsWith('claim-game/')
			? parts.length === 4
				? parseClaimButton(`redeem:${parts[1]}:${parts[2]}:${parts[3]}`)
				: null
			: parts.length === 2
				? parseClaimButton(`code-${parts[1]}`)
				: parts.length === 3
					? parseClaimButton(`redeem:${parts[1]}:${parts[2]}`)
					: null;
		if (!parsed) return this.none();
		return this.some({ ...parsed, memberCode: interaction.fields.getTextInputValue('memberCodeInput').trim() });
	}
}
