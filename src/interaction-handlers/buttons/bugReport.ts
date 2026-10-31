import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';
import { v2 } from '../../lib/presentation/components.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.Button })
export class ButtonHandler extends InteractionHandler {
	public override async run(interaction: ButtonInteraction, { userId }: InteractionHandler.ParseResult<this>) {
		if (interaction.user.id !== userId || !interaction.inGuild())
			return interaction.reply(v2({ content: 'Run /bug to start your own private report.', flags: MessageFlags.Ephemeral }, 'Bug report'));
		const banned = await this.container.prisma.bugReporter.findUnique({ where: { id: userId } });
		if (banned?.banned)
			return interaction.reply(v2({ content: 'You are banned from using Radon.', flags: MessageFlags.Ephemeral }, 'Bug report'));
		const modal = new ModalBuilder().setCustomId(`bug:submit:${userId}`).setTitle('Bug report · Misuse leads to bot ban');
		modal.addComponents(
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('summary')
					.setLabel('Briefly describe the bug')
					.setStyle(TextInputStyle.Short)
					.setMinLength(10)
					.setMaxLength(120)
					.setRequired(true)
			),
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('details')
					.setLabel('Steps, expected result, and actual result')
					.setPlaceholder('Never include passwords, tokens, or account codes.')
					.setStyle(TextInputStyle.Paragraph)
					.setMinLength(30)
					.setMaxLength(1800)
					.setRequired(true)
			)
		);
		return interaction.showModal(modal);
	}
	public override parse(interaction: ButtonInteraction) {
		const match = /^bug:open:(\d{17,20})$/.exec(interaction.customId);
		return match ? this.some({ userId: match[1] }) : this.none();
	}
}
