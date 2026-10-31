import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { guideContent, guideButtons, guideTopics, type GuideTopic } from '../../lib/redemption/guide.js';

@ApplyOptions<InteractionHandler.Options>({ interactionHandlerType: InteractionHandlerTypes.Button })
export class ButtonHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		const topic = interaction.customId.startsWith('guide:') ? interaction.customId.slice(6) : '';
		return guideTopics.includes(topic as GuideTopic) ? this.some(topic as GuideTopic) : this.none();
	}
	public override run(interaction: ButtonInteraction, topic: GuideTopic) {
		if (interaction.message.flags.has(MessageFlags.Ephemeral))
			return interaction.update({ content: guideContent(topic), components: [guideButtons()], allowedMentions: { parse: [] } });
		// Reply privately so a guide button on a public coupon never edits that post.
		return interaction.reply({
			content: guideContent(topic),
			components: [guideButtons()],
			flags: MessageFlags.Ephemeral,
			allowedMentions: { parse: [] }
		});
	}
}
