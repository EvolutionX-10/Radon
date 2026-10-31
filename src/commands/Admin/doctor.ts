import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { UserCommand as DebugCommand } from './debug.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevels } from '../../lib/types/permissionLevels.js';

/** Both registered names use the same diagnostics and collector implementation. */
@ApplyOptions<RadonCommand.Options>({
	description: 'Check Radon configuration, permissions, protection and recovery',
	requiredClientPermissions: [],
	permissionLevel: PermissionLevels.Administrator
})
export class UserCommand extends DebugCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts(InteractionContextType.Guild)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		);
	}
}
