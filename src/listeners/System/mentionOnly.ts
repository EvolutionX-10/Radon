import { prefixDB } from '#models';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import type { Message } from 'discord.js';
@ApplyOptions<ListenerOptions>({
    event: Events.MessageCreate,
})
export class UserListener extends Listener<typeof Events.MessageCreate> {
    public override async run(message: Message) {
        // Checking if bot was mentioned or not
        if (!vars.owners.includes(message.author.id)) return;
        const condition1 = message.content.includes(
            this.container.client.id as string
        );
        const condition2 = message.mentions.users.size == 1;
        const condition3 =
            message.content == `<@${this.container.client.id}>` ||
            message.content == `<@!${this.container.client.id}>`;
        const database = await prefixDB.findById(message.guildId);
        const statement = 'The prefix in this server is set to: ';
        if (condition1 && condition2 && condition3) {
            if (database) {
                const { prefix }: { prefix: string } = database;
                send(message, {
                    content: statement + `\`${prefix}\``,
                });
                return;
            } else
                return send(message, {
                    content: statement + '`$`',
                });
        } else return;
    }
}
