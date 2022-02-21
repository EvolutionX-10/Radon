import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { free } from '@sapphire/plugin-editable-commands';
import { Time } from '@sapphire/time-utilities';
import { ApplyOptions } from '@sapphire/decorators';
@ApplyOptions<ListenerOptions>({
    event: Events.MessageCreate,
})
export class UserListener extends Listener<typeof Events.MessageCreate> {
    async run(message: Message) {
        setTimeout(() => free(message), Time.Hour);
    }
}
