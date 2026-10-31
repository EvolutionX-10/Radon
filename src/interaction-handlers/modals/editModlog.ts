import { isModerationStaff } from '../../lib/moderation/authorization.js';
import { ModerationCases } from '../../lib/moderation/cases.js';
import { getWarningLogIds } from '../../lib/moderation/warningLog.js';
import { Embed } from '../../lib/structures/classes/Embed.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override async run(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
		if (!(await isModerationStaff(actor, this.container.prisma)))
			return interaction.editReply('Only configured moderation staff can edit reasons.');
		const message = await result.channel.messages.fetch(result.messageId);

		if (!message || message.author.id !== interaction.client.user.id) return interaction.editReply('This moderation log is unavailable.');

		if (!message.embeds[0]?.description) return interaction.editReply('This moderation log has no editable reason.');

		const warningLog = message.embeds[0].title === 'Warn' || message.embeds[0].title?.startsWith('Warn · Case ');
		if (warningLog) {
			const ids = getWarningLogIds(message.embeds[0].fields);
			if (!ids) return interaction.editReply('This warning log has missing or invalid warning references. Its stored reason was not changed.');
			if (!interaction.guild.settings) return interaction.editReply('Warning storage is unavailable. Please try again later.');
			await interaction.guild.settings.warns.updateReason(ids.memberID, ids.warnID, result.reason);
		}

		const record = await this.container.prisma.moderationCase.findFirst({ where: { guildId: interaction.guild.id, logMessageId: message.id } });
		if (record) await new ModerationCases(this.container.prisma).editReason(interaction.guild.id, record.id, actor.id, result.reason);

		await message.edit({
			embeds: [new Embed(message.embeds[0].data)._description(result.reason)]
		});

		return interaction.editReply('Reason updated.');
	}

	public override parse(interaction: ModalSubmitInteraction<'cached'>) {
		const { customId } = interaction;

		if (!customId.startsWith('@edit_reason')) return this.none();

		const reason = interaction.fields.getTextInputValue('reason');

		const [, channelId, messageId] = customId.split('/');
		const channel = interaction.guild.channels.cache.get(channelId);

		if (!channel || !channel.isTextBased()) return this.none();

		return this.some({ reason, channel, messageId });
	}
}
