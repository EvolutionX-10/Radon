import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType } from 'discord.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { bugWarning } from '../../lib/bugs/presentation.js';

@ApplyOptions<RadonCommand.Options>({ description: 'Report a bot bug privately to the Radon owner' })
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setContexts(InteractionContextType.Guild)
		);
	}
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		return interaction.reply(bugWarning(interaction.user.id));
	}
}
