import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevels } from '../../lib/types/permissionLevels.js';
import { openAdminBrowser } from '../../lib/setup/browser.js';
import { diagnosticPages } from '../../lib/setup/diagnostics.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Check Radon configuration, permissions, protection and recovery',
	requiredClientPermissions: [],
	permissionLevel: PermissionLevels.Administrator
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		);
	}
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		return openAdminBrowser(
			interaction,
			this.container.prisma,
			() => diagnosticPages(this.container.prisma, interaction.guild),
			(error) => this.container.logger.error('Diagnostics interaction failed', error)
		);
	}
}
