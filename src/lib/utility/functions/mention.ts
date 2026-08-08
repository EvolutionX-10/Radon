import type { RadonClient } from '#lib/RadonClient';
import { ApplicationCommand, ApplicationCommandType } from 'discord.js';

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
	return `</${command.name}:${command.id}>`;
}
