import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { get } from '@sapphire/plugin-editable-commands';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<ListenerOptions>({
	event: Events.MessageDelete
})
export class UserListener extends Listener<typeof Events.MessageDelete> {
	public override async run(message: Message) {
		if (!message.guild) return;

		const response = get(message);
		if (!response) return;

		return response.deletable ? response.delete() : null;
	}
}
