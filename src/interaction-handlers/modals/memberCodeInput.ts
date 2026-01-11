import { Emojis } from '#constants';
import { RadonEvents } from '#lib/types';
import { claimCoupon } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { GuildTextBasedChannel, MessageFlags, ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override async run(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const { memberCode, code } = result;
		const userId = interaction.user.id;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		// Save the member code to the database
		await this.container.prisma.memberCodes.create({
			data: {
				id: userId,
				memberCodes: [memberCode],
				createdAt: new Date(),
				updatedAt: new Date()
			}
		});

		const response = await claimCoupon(code, memberCode);
		this.container.client.emit(RadonEvents.CodeClaim, {
			...response,
			userTag: interaction.user.tag,
			avatarURL: interaction.user.displayAvatarURL(),
			guild: interaction.guild!.name,
			guildId: interaction.guild!.id,
			channel: (interaction.channel as GuildTextBasedChannel).name,
			channelId: interaction.channel!.id
		});

		if (response.success) {
			return interaction.editReply({
				content: `${Emojis.Confirm} ${response.message}!`
			});
		} else {
			return interaction.editReply({
				content: `${Emojis.Cross} Failed to claim coupon.\n\n**Reason:** ${response.message}`
			});
		}
	}

	public override parse(interaction: ModalSubmitInteraction<'cached'>) {
		const { customId } = interaction;

		if (!customId.startsWith('claim-set-modal')) return this.none();
		const code = customId.split('/')[1];

		const memberCode = interaction.fields.getTextInputValue('memberCodeInput');

		return this.some({ memberCode, code });
	}
}
