import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, ModalBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';
import { disableClaimButtons, parseClaimButton } from '../../lib/redemption/posts.js';
import { runClaims } from '../../lib/redemption/runtime.js';
import { accountOwnerKey, getGame } from '../../lib/redemption/games.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.Button })
export class ButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		const parsed = parseClaimButton(interaction.customId);
		return parsed ? this.some(parsed) : this.none();
	}
	public override async run(
		interaction: ButtonInteraction,
		{ code, expired, game: gameId = 'sololv', expiresAt: gameExpiry }: { code: string; expired: boolean; game?: string; expiresAt?: number }
	) {
		const game = getGame(gameId);
		if (expired) {
			await interaction.reply({ content: 'This coupon post has expired.', flags: MessageFlags.Ephemeral });
			await interaction.message
				.edit({ components: disableClaimButtons(interaction.message.components.map((component) => component.toJSON())) })
				.catch(() => null);
			return;
		}
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			// A modal must be the initial response; bound lookup time to preserve Discord's response deadline.
			const data = await Promise.race([
				this.container.prisma.memberCodes.findUnique({ where: { id: accountOwnerKey(interaction.user.id, game.id) } }),
				new Promise<never>((_, reject) => {
					timer = setTimeout(() => reject(new Error('Account lookup timed out')), 1_500);
				})
			]);
			if (data?.memberCodes.length) {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				return runClaims(interaction, code, data.memberCodes, game.id);
			}
			const expiresAt =
				gameExpiry !== undefined
					? gameExpiry.toString(36)
					: interaction.customId.startsWith('redeem:')
						? interaction.customId.split(':')[1]
						: '0';
			const modal = new ModalBuilder()
				.setCustomId(game.id === 'sololv' ? `claim-set-modal/${expiresAt}/${code}` : `claim-game/${game.id}/${expiresAt}/${code}`)
				.setTitle(`Save ${game.name} account`.slice(0, 45))
				.addTextDisplayComponents((text) =>
					text.setContent(
						`In ${game.name}, open Settings → Account and copy your Member Code. Radon saves it so future claims need only a button click. Use /guide for help.`
					)
				)
				.addLabelComponents((label) =>
					label
						.setLabel('Member Code')
						.setTextInputComponent((input) =>
							input
								.setCustomId('memberCodeInput')
								.setStyle(TextInputStyle.Short)
								.setMinLength(game.minLength)
								.setMaxLength(game.maxLength)
								.setRequired(true)
						)
				);
			return interaction.showModal(modal);
		} catch {
			const reply = { content: 'Account lookup is temporarily unavailable. Please try again.', flags: MessageFlags.Ephemeral as const };
			return interaction.deferred || interaction.replied ? interaction.editReply({ content: reply.content }) : interaction.reply(reply);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}
