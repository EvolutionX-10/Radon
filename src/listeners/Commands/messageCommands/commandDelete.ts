import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { get } from '@sapphire/plugin-editable-commands';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.MessageDelete
})
export class UserListener extends Listener {
	public override run(message: Message) {
		if (!message.guild) return;

		const response = get(message);
		if (!response) return;

		return response.deletable ? response.delete() : null;
	}
}
