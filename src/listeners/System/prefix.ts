import { modesDB } from '#models';
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
        const ownerMode = mode?.ownerMode;
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
        this.container.client.fetchPrefix = (message: Message) => {
            if (!message.guild) {
                if (vars.owners.includes(message.author.id)) {
                    return vars.owner_prefixes;
                } else return null;
            }
            if (vars.owners.includes(message.author.id)) {
                return vars.owner_prefixes;
            } else return null;
        };
    }
}

type status = 'idle' | 'online' | 'invisible' | 'dnd';
type activity = {
    name: string;
    type: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>;
};
