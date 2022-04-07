import { Listener, Events, MessageCommandAcceptedPayload, ListenerOptions } from '@sapphire/framework';
import { isOwner } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
@ApplyOptions<ListenerOptions>({
	event: Events.MessageCommandSuccess
})
export class UserListener extends Listener<typeof Events.MessageCommandSuccess> {
	run({ message, command }: MessageCommandAcceptedPayload) {
		message.author.spam = 0;
		const commandName = command.name;
		const author = `${message.author.username}[${message.author.id}]`;
		if (isOwner(message.author)) return;
		const sentAt = message.guild ? `Guild: ${message.guild.name}[${message.guildId}]` : 'Direct Messages';

		this.container.logger.debug(`${commandName} by ${author} ${sentAt}`);
	}
}
