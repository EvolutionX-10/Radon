import { modesDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { Interaction } from 'discord.js';
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
            const { ownerMode } = mode;
            if (ownerMode) {
                await modesDB.findByIdAndUpdate(
                    id,
                    {
                        ownerMode: false,
                    },
                    {
                        timestamps: true,
                    }
                );
            } else {
                await modesDB.findByIdAndUpdate(
                    id,
                    {
                        ownerMode: true,
                    },
                    {
                        timestamps: true,
                    }
                );
            }
            const description = ownerMode
                ? 'Status: Disabled'
                : 'Status: Enabled';
            const msg = await interaction.channel?.messages.fetch(
                interaction.message.id
            );
            await msg?.edit({
                embeds: [msg.embeds[0].setDescription(description)],
            });
        }
    }
}
