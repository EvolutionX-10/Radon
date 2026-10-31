import { RadonCommand } from '#lib/structures/commands/RadonCommand.js';
import { findUpdate, updateChoices } from '#lib/updates/catalogue.js';
import { updateCard } from '#lib/updates/presentation.js';
import { v2 } from '#lib/presentation/components.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags, type AutocompleteInteraction } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({ description: "See what's new in Radon" })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.addStringOption((option) =>
					option.setName('release').setDescription('Choose an older update; defaults to the latest').setAutocomplete(true)
				)
		);
	}

	public override autocompleteRun(interaction: AutocompleteInteraction) {
		return interaction.respond(updateChoices(interaction.options.getFocused()));
	}

	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const entry = findUpdate(interaction.options.getString('release'));
		if (!entry)
			return interaction.reply(
				v2({ content: 'That update is unavailable. Run /updates and choose a release from the suggestions.', flags: MessageFlags.Ephemeral })
			);
		return interaction.reply({
			components: [updateCard(entry)],
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] }
		});
	}
}
