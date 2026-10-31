import { v2 } from '../../lib/presentation/components.js';
import { isModerationStaff } from '../../lib/moderation/authorization.js';
import { ModerationCases } from '../../lib/moderation/cases.js';
import { getWarningLogIds } from '../../lib/moderation/warningLog.js';
import { readModlog, updatedModlog } from '../../lib/presentation/modlog.js';
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
			return interaction.editReply(v2('Only configured moderation staff can edit reasons.', 'Moderation log'));
		const message = await result.channel.messages.fetch(result.messageId);

		if (!message || message.author.id !== interaction.client.user.id)
			return interaction.editReply(v2('This moderation log is unavailable.', 'Moderation log'));

		const log = readModlog(message);
		if (!log?.description) return interaction.editReply(v2('This moderation log has no editable reason.', 'Moderation log'));

		const warningLog = log.title === 'Warn' || log.title?.startsWith('Warn · Case ');
		if (warningLog) {
			const ids = getWarningLogIds(log.fields ?? []);
			if (!ids)
				return interaction.editReply(
					v2('This warning log has missing or invalid warning references. Its stored reason was not changed.', 'Moderation log')
				);
			if (!interaction.guild.settings)
				return interaction.editReply(v2('Warning storage is unavailable. Please try again later.', 'Moderation log'));
			await interaction.guild.settings.warns.updateReason(ids.memberID, ids.warnID, result.reason);
		}

		const record = await this.container.prisma.moderationCase.findFirst({ where: { guildId: interaction.guild.id, logMessageId: message.id } });
		if (record) await new ModerationCases(this.container.prisma).editReason(interaction.guild.id, record.id, actor.id, result.reason);

		await message.edit(message.embeds[0] ? { embeds: [new Embed(log)._description(result.reason)] } : updatedModlog(message, result.reason));

		return interaction.editReply(v2('Reason updated.', 'Moderation log'));
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
