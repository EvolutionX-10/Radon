import { modesDB, prefixDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { ExcludeEnum, Message } from 'discord.js';
import { vars } from '#vars';
import type { ActivityTypes } from 'discord.js/typings/enums';

@ApplyOptions<ListenerOptions>({
    event: Events.ClientReady,
})
export class UserListener extends Listener {
    public async run() {
        const mode = await modesDB.findById('61cf428394b75db75b5dafb4');
        const ownerMode: boolean = mode.ownerMode;
        const check = async () => {
            const current = this.container.client.user?.presence.status;
            const newstatus: status = ownerMode ? 'invisible' : 'dnd';
            const activity: activity = {
                name: ownerMode ? 'Evo' : 'for Rule Breakers',
                type: ownerMode ? 'LISTENING' : 'WATCHING',
            };
            if (current === newstatus) return;
            this.container.client.user?.setPresence({
                status: newstatus,
                activities: [
                    {
                        name: activity.name,
                        type: activity.type,
                    },
                ],
            });
            setTimeout(check, 1000);
        };
        await check();
        this.container.client.fetchPrefix = async (message: Message) => {
            const database = await prefixDB.findById(message.guildId);
            if (ownerMode) {
                if (database) {
                    const {
                        prefix,
                        ownerPrefix,
                    }: { prefix: string; ownerPrefix: boolean } = database;
                    if (
                        vars.owners.includes(message.author.id) &&
                        ownerPrefix
                    ) {
                        let guild_prefix: string[] = [];
                        guild_prefix.push(prefix);
                        guild_prefix = guild_prefix.concat(vars.owner_prefixes);
                        return guild_prefix;
                    } else {
                        const guild_prefix: string[] = [];
                        guild_prefix.push(prefix);
                        return guild_prefix;
                    }
                }

                return vars.prefixes.concat(vars.owner_prefixes);
            }
            if (!message.guild) {
                if (vars.owners.includes(message.author.id)) {
                    return vars.prefixes.concat(vars.owner_prefixes);
                } else return vars.prefixes;
            }

            if (database) {
                const {
                    prefix,
                    ownerPrefix,
                }: { prefix: string; ownerPrefix: boolean } = database;
                if (vars.owners.includes(message.author.id) && ownerPrefix) {
                    let guild_prefix: string[] = [];
                    guild_prefix.push(prefix);
                    guild_prefix = guild_prefix.concat(vars.owner_prefixes);
                    return guild_prefix;
                } else {
                    const guild_prefix: string[] = [];
                    guild_prefix.push(prefix);
                    return guild_prefix;
                }
            }
            if (vars.owners.includes(message.author.id)) {
                return vars.prefixes.concat(vars.owner_prefixes);
            } else return vars.prefixes;
        };
    }
}

type status = 'idle' | 'online' | 'invisible' | 'dnd';
type activity = {
    name: string;
    type: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>;
};
