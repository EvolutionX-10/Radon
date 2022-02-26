import { RadonCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import type { Args } from '@sapphire/framework';
import type { Message } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    aliases: ['s'],
})
export class UserCommand extends RadonCommand {
    public async messageRun(message: Message, args: Args) {
        const num = await args.pick('number').catch(() => null);
        if (!num) return;
        for (let i = 0; i < num; i++) {
            await wait(100);
            await message.channel.send(`${i + 1}`);
        }
    }
}
async function wait(ms: number) {
    const wait = (await import('util')).promisify(setTimeout);
    return wait(ms);
}
