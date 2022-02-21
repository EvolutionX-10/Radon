import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { get } from '@sapphire/plugin-editable-commands';
import { ApplyOptions } from '@sapphire/decorators';
import { mins } from '#lib/utility';
@ApplyOptions<ListenerOptions>({
    event: Events.MessageDelete,
})
export class UserListener extends Listener<typeof Events.MessageDelete> {
    async run(message: Message) {
        if (!message.guild) return;
        const response = get(message);
        if (!response) return;
        if (message.createdTimestamp < Date.now() - mins(30)) return;
        response.deletable ? await response.delete() : null;
    }
}
