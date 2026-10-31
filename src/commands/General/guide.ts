import { RadonCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags } from 'discord.js';
import { guideButtons, guideContent, guideTopics, type GuideTopic } from '../../lib/redemption/guide.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Learn coupon claiming, supported games, and optional vote rewards' })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.addStringOption((option) =>
					option
						.setName('topic')
						.setDescription('Choose a guide topic')
						.addChoices(...guideTopics.map((topic) => ({ name: topic, value: topic })))
				)
		);
	}
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		return interaction.reply({
			content: guideContent((interaction.options.getString('topic') ?? 'start') as GuideTopic),
			components: [guideButtons()],
			flags: MessageFlags.Ephemeral,
			allowedMentions: { parse: [] }
		});
	}
}
