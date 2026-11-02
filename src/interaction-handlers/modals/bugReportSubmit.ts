import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { Owners } from '#constants';
import { BugReportError, BugReports } from '../../lib/bugs/service.js';
import { bugReportCard } from '../../lib/bugs/presentation.js';
import { v2 } from '../../lib/presentation/components.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.ModalSubmit })
export class ModalHandler extends InteractionHandler {
	public override async run(interaction: ModalSubmitInteraction, { userId }: InteractionHandler.ParseResult<this>) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		if (interaction.user.id !== userId || !interaction.guildId || !interaction.channelId)
			return interaction.editReply(v2('Run /bug in a server to start your own report.', 'Bug report'));
		try {
			const { report, created } = await new BugReports(this.container.prisma, Owners).submit({
				id: interaction.id,
				reporterId: interaction.user.id,
				guildId: interaction.guildId,
				channelId: interaction.channelId,
				summary: interaction.fields.getTextInputValue('summary'),
				details: interaction.fields.getTextInputValue('details')
			});
			// Save first: disabled DMs or a Discord outage cannot lose the report.
			if (created)
				await Promise.all(
					Owners.map(async (ownerId) => {
						try {
							const owner = await interaction.client.users.fetch(ownerId);
							await owner.send(bugReportCard(report));
						} catch {
							this.container.logger.warn(`Bug report ${report.id} saved; owner notification unavailable.`);
						}
					})
				);
			return interaction.editReply(
				v2(`Your bug report was saved for the Radon owner. Thank you.\nReport reference: \`${report.id}\``, 'Bug report saved')
			);
		} catch (error) {
			if (error instanceof BugReportError) return interaction.editReply(v2(error.message, 'Bug report'));
			this.container.logger.error('Could not save a bug report.');
			return interaction.editReply(
				v2('Your report could not be saved. Please try again. Keep a copy of your report until it is confirmed.', 'Bug report')
			);
		}
	}
	public override parse(interaction: ModalSubmitInteraction) {
		const match = /^bug:submit:(\d{17,20})$/.exec(interaction.customId);
		return match ? this.some({ userId: match[1] }) : this.none();
	}
}
