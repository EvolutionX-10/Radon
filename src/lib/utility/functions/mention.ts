import type { RadonClient } from '#lib/RadonClient';
import { ApplicationCommand, ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';

export async function mention(command: string, client: RadonClient) {
	const commands = await (await client.application?.fetch())?.commands.fetch();

	if (!commands) throw new Error('Failed to fetch commands!');

	const commandNames = command.split(' ');

	const slash = commands.find((c) => c.name === commandNames[0]);

	if (!slash) return `/${command}`;

	return `</${command}:${slash.id}>`;
}

export function mentionCommand(command: ApplicationCommand) {
	if (command.type !== ApplicationCommandType.ChatInput) return command.name;
	const subcmdGrp = command.options.filter((option) => option.type === ApplicationCommandOptionType.SubcommandGroup);
	const subcmd = command.options.filter((option) => option.type === ApplicationCommandOptionType.Subcommand);

	const mentions = [];
	if (subcmdGrp.length === 0 && subcmd.length === 0) return `</${command.name}:${command.id}>`;

	for (const group of subcmdGrp) {
		for (const sub of group.options?.filter((option) => option.type === ApplicationCommandOptionType.Subcommand) ?? []) {
			mentions.push(`</${command.name} ${group.name} ${sub.name}:${command.id}>`);
		}
	}

	for (const sub of subcmd) {
		mentions.push(`</${command.name} ${sub.name}:${command.id}>`);
	}

	return mentions.join('\n');
}
