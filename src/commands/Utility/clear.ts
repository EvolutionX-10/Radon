import { des } from '#lib/messages';
import { RadonCommand } from '#lib/structures';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type {
    ApplicationCommandRegistry,
    ChatInputCommand,
} from '@sapphire/framework';
import type { TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    cooldownDelay: sec(15),
    description: des.utility.clear,
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        ...[interaction]: Parameters<ChatInputCommand['chatInputRun']>
    ) {
        await interaction.deferReply({ ephemeral: true });
        const count = interaction.options.getNumber('count', true);
        const channel = interaction.channel as TextChannel;
        let dels = 0;
        if (count > 100) {
            const arr = summableArray(count, 100);
            const p = new Promise((resolve: (value: void) => void) => {
                arr.forEach(async (num, i, ar) => {
                    setTimeout(async () => {
                        if (i === ar.length - 1) resolve();
                        const { size } = await channel.bulkDelete(num, true);
                        dels += size;
                    }, 2000 * i);
                });
            });
            p.then(async () => {
                await interaction.editReply({
                    content: `${vars.emojis.confirm} Deleted ${dels} messages`,
                });
            });
        } else {
            const { size } = await channel.bulkDelete(count, true);
            dels = size;
            await interaction.editReply({
                content: `${vars.emojis.confirm} Deleted ${dels} messages`,
            });
        }
    }
    public async registerApplicationCommands(
        registry: ApplicationCommandRegistry
    ) {
        registry.registerChatInputCommand(
            {
                name: this.name,
                description: this.description,
                options: [
                    {
                        name: 'count',
                        description: 'Number of messages to delete',
                        minValue: 1,
                        maxValue: 500,
                        type: 'NUMBER',
                        required: true,
                    },
                ],
            },
            {
                guildIds: vars.guildIds,
                idHints: ['946807890658857030'],
            }
        );
    }
}
// async function wait(ms: number) {
//     const wait = (await import('util')).promisify(setTimeout);
//     return wait(ms);
// }
/**
 * Creates an array of `part`s up to the `maximum`
 * @param maximum The maximum reached at which the function should stop adding new elements to the array.
 * @param part The value of which each element of the array should be, with the remainder up to the maximum being the last entry of the array.
 * @returns An array of `part`s with the remainder being whatever of a `part` did not fit within the boundaries set by `max`.
 */
function summableArray(maximum: number, part: number) {
    const arr = [];
    let current = 0;

    while (current < maximum) {
        const next = Math.min(part, maximum - current);
        arr.push(next);
        current += next;
    }

    return arr;
}
