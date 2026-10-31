import type { PermissionLevel } from '#lib/decorators';
import type { RadonCommand } from '#lib/structures';
import type { ChatInputCommand } from '@sapphire/framework';
import { ApplicationCommandOptionType, ApplicationCommandType, type ApplicationCommand, type ApplicationCommandOption } from 'discord.js';
import type { HelpEntry } from './layout.js';

export interface HelpRoute {
	path: string;
	description: string;
	options: readonly ApplicationCommandOption[];
}

/** Expand every runnable leaf, including subcommand groups, from Discord's registration. */
export function getHelpRoutes(description: string, options: readonly ApplicationCommandOption[], path = ''): HelpRoute[] {
	const subcommands = options.filter(
		(option) => option.type === ApplicationCommandOptionType.Subcommand || option.type === ApplicationCommandOptionType.SubcommandGroup
	);
	if (!subcommands.length) return [{ path, description, options }];
	return subcommands.flatMap((option) => getHelpRoutes(option.description, option.options ?? [], [path, option.name].filter(Boolean).join(' ')));
}

/** External checks preserve the real permission tree without consuming command cooldowns. */
export async function canDiscoverCommand(command: RadonCommand, interaction: RadonCommand.ChatInputCommandInteraction): Promise<boolean> {
	if (!command.enabled) return false;
	return (await command.preconditions.chatInputRun(interaction, command as ChatInputCommand, { external: true })).isOk();
}

export function getApplicationHelpEntries(
	command: RadonCommand,
	registered: ApplicationCommand,
	allowedLevels: ReadonlySet<PermissionLevel>
): HelpEntry[] {
	const category = command.category ?? 'General';
	if (registered.type !== ApplicationCommandType.ChatInput) {
		const target = registered.type === ApplicationCommandType.User ? 'user' : 'message';
		return [
			{
				name: registered.name,
				description: command.description,
				category,
				usage: `Right-click a ${target} → Apps → ${registered.name}`
			}
		];
	}
	return getHelpRoutes(registered.description, registered.options).flatMap((route) => {
		if (command.unavailableSubcommands.includes(route.path)) return [];
		const level = command.subcommandPermissions.get(route.path);
		if (level && !allowedLevels.has(level)) return [];
		const name = `/${registered.name}${route.path ? ` ${route.path}` : ''}`;
		const args = route.options.map((option) => ('required' in option && option.required ? `<${option.name}>` : `[${option.name}]`));
		return [
			{
				name,
				description: route.description,
				category,
				usage: [name, ...args].join(' '),
				details: route.options.map((option) => `${option.name}: ${option.description}`).join('\n') || undefined
			}
		];
	});
}
