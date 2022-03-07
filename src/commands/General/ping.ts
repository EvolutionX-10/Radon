import type { CommandInteraction, Message } from 'discord.js';
import { RadonCommand } from '#lib/structures';
import { send } from '@sapphire/plugin-editable-commands';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionLevels } from '#lib/types';
import type { ApplicationCommandRegistry } from '@sapphire/framework';
import { vars } from '#vars';
@ApplyOptions<RadonCommand.Options>({
    description: `Check my latency!`,
    permissionLevel: PermissionLevels.Everyone,
})
export class UserCommand extends RadonCommand {
    public async messageRun(message: RadonCommand.Message) {
        const msg = await send(message, 'Ping?');
        const content = `Pong! (Roundtrip took: ${Math.round(
            (msg.editedTimestamp || msg.createdTimestamp) -
                (message.editedTimestamp || message.createdTimestamp)
        )}ms. Heartbeat: ${Math.round(this.container.client.ws.ping)}ms.)`;
        return send(message, content);
    }
    public async chatInputRun(interaction: CommandInteraction) {
        const msg = (await interaction.reply({
            content: `Ping?`,
            ephemeral: true,
            fetchReply: true,
        })) as Message;
        const { diff, ping } = this.getPing(msg, interaction);
        return await interaction.editReply({
            content: `Pong! (Roundtrip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
        });
    }
    public async registerApplicationCommands(
        registry: ApplicationCommandRegistry
    ) {
        registry.registerChatInputCommand(
            {
                name: this.name,
                description: this.description,
            },
            {
                guildIds: vars.guildIds,
                idHints: ['947723983132966934', '947165795874668554'],
            }
        );
    }
    private getPing(message: Message, interaction: CommandInteraction) {
        const diff =
            (message.editedTimestamp || message.createdTimestamp) -
            interaction.createdTimestamp;
        const ping = Math.round(this.container.client.ws.ping);

        return { diff, ping };
    }
}
