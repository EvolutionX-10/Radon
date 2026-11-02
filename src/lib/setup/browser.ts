import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, type ContainerBuilder } from 'discord.js';
import type { PrismaClient } from '@prisma/client';
import type { RadonCommand } from '../structures/commands/RadonCommand.js';
import { card, componentMessage, text } from '../presentation/components.js';
import { requireSetupAdmin } from './configuration.js';

/** Bounded, private, user-bound navigation shared by configuration and diagnostics. */
export async function openAdminBrowser(
	interaction: RadonCommand.ChatInputCommandInteraction,
	prisma: PrismaClient,
	load: () => Promise<ContainerBuilder[]>,
	logError: (error: unknown) => void
) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	let pages: ContainerBuilder[];
	try {
		await requireSetupAdmin(interaction.guild, prisma, interaction.user.id);
		pages = await load();
	} catch (error) {
		logError(error);
		return interaction.editReply(
			componentMessage(text(card('Report unavailable'), 'Access or configuration could not be checked. Please try again.'))
		);
	}
	let index = 0;
	let closed = false;
	const payload = () => ({
		...componentMessage(pages[index]),
		components: [
			pages[index],
			...(closed ? [text(card('Report expired'), 'Run the command again to refresh this report.')] : []),
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('admin-view:back')
					.setLabel('Back')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(closed || index === 0),
				new ButtonBuilder()
					.setCustomId('admin-view:next')
					.setLabel(`Next · ${index + 1}/${pages.length}`)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(closed || index === pages.length - 1),
				new ButtonBuilder().setCustomId('admin-view:refresh').setLabel('Refresh').setStyle(ButtonStyle.Primary).setDisabled(closed)
			)
		]
	});
	const message = await interaction.editReply(payload());
	const collector = message.createMessageComponentCollector({
		time: 10 * 60_000,
		idle: 5 * 60_000,
		filter: (i) => i.customId.startsWith('admin-view:')
	});
	let pending = Promise.resolve();
	const enqueue = (run: () => Promise<unknown>) =>
		(pending = pending
			.then(run)
			.then(() => undefined)
			.catch(logError));
	collector.on('collect', async (i) => {
		try {
			if (i.user.id !== interaction.user.id)
				return void (await i.reply({ content: 'Run the command to open your own private report.', flags: MessageFlags.Ephemeral }));
			await i.deferUpdate();
			await enqueue(async () => {
				if (collector.ended || closed) return;
				try {
					await requireSetupAdmin(interaction.guild, prisma, i.user.id);
				} catch {
					closed = true;
					collector.stop('access');
					await i.editReply(
						componentMessage(
							text(
								card('Report closed'),
								'Your administrator access could not be confirmed. Run the command again after access is restored.'
							)
						)
					);
					return;
				}
				if (i.customId === 'admin-view:refresh') {
					try {
						pages = await load();
					} catch (error) {
						logError(error);
						await i.followUp({
							...componentMessage(
								text(
									card('Refresh unavailable'),
									'Could not reload the configuration. The previous report has been kept; try Refresh again.'
								)
							),
							flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
						});
						return;
					}
				} else if (i.customId === 'admin-view:back') index = Math.max(0, index - 1);
				else if (i.customId === 'admin-view:next') index = Math.min(pages.length - 1, index + 1);
				index = Math.min(index, pages.length - 1);
				await i.editReply(payload());
			});
		} catch (error) {
			logError(error);
		}
	});
	collector.on('end', () => {
		void enqueue(async () => {
			if (closed) return;
			closed = true;
			await interaction.editReply(payload());
		});
	});
	return message;
}
