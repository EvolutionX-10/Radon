import { modesDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { Interaction, Message } from 'discord.js';
@ApplyOptions<ListenerOptions>({
    event: Events.InteractionCreate,
})
export class UserListener extends Listener {
    public async run(interaction: Interaction) {
        const id = '61cf428394b75db75b5dafb4';
        if (!interaction.isButton()) return;
        if (interaction.customId === 'radon-maintenance') {
            await interaction.deferUpdate({ fetchReply: true });
            const mode = await modesDB.findById(id);
            const ownerMode = mode?.ownerMode as boolean;
            if (ownerMode) {
                await modesDB.findByIdAndUpdate(id, {
                    ownerMode: false,
                });
            } else {
                await modesDB.findByIdAndUpdate(id, {
                    ownerMode: true,
                });
            }
            const description = ownerMode
                ? '```\n' + 'Status: Disabled' + '\n' + '```'
                : '```\n' + 'Status: Enabled' + '\n' + '```';
            const msg = interaction.message as Message;
            await msg?.edit({
                embeds: [msg.embeds[0].setDescription(description)],
            });
            this.container.client.user?.setPresence({
                status: ownerMode ? 'dnd' : 'invisible',
                activities: [
                    {
                        name: ownerMode ? 'for Rule Breakers' : 'Evo',
                        type: ownerMode ? 'WATCHING' : 'LISTENING',
                    },
                ],
            });
        }
    }
}
