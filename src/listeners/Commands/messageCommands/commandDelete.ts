import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { get } from '@sapphire/plugin-editable-commands';
import type { RadonEvents } from '#lib/types';

export class UserListener extends Listener<typeof RadonEvents.MessageDelete> {
	public override run(message: Message) {
		if (!message.guild) return;

		const response = get(message);
		if (!response) return;

		return response.deletable ? response.delete() : null;
	}
}
