import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { color } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import type { TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    description: `Blacklist a guild`,
    permissionLevel: PermissionLevels.BotOwner,
    subCommands: [
        {
            input: 'add',
            default: true,
        },
        {
            input: 'remove',
        },
        {
            input: 'rem',
            output: 'remove',
        },
    ],
    flags: ['force'],
    aliases: ['bl'],
})
export class UserCommand extends RadonCommand {
    public async add(message: RadonCommand.Message, args: RadonCommand.Args) {
        const id = await args.pick('string').catch(() => null);
        if (!id) return send(message, `Please provide a valid ID.`);
        const reason = await args.rest('string').catch(() => null);
        if (!reason) return send(message, `Please provide a reason.`);
        const guild = await this.container.client.guilds
            .fetch(id)
            .catch(() => null);
        if (!guild && !args.getFlags('force'))
            return send(message, `I can't find that guild.`);
        if (args.getFlags('force') && !guild) {
            await this.container.settings.blacklists.add(id, reason);
            send(message, `Successfully blacklisted \`${id}\` for ${reason}.`);
        }
        if (guild) {
            await guild.leave();
            const k = await guild?.settings?.blacklists
                .add(id, reason)
                .catch(() => undefined);
            if (typeof k === 'undefined')
                console.log(`Could Not Save Blacklist`);
            send(message, `Left ${guild.name}`);
        }
        const channel = this.container.client.channels.cache.get(
            '950646836471947294'
        ) as TextChannel;
        if (!channel) return;
        const webhook = (await channel.fetchWebhooks()).first();
        if (!webhook || !webhook.token) return;
        const description =
            `Guild: ${guild?.name ?? ``} \`${id}\`` + `\nReason: ${reason}`;
        return webhook.send({
            embeds: [
                {
                    color: color.System,
                    thumbnail: {
                        url: guild?.iconURL() ?? '',
                    },
                    description,
                    timestamp: Date.now(),
                },
            ],
            username: 'Radon Blacklists',
            avatarURL: this.container.client.user?.displayAvatarURL() ?? '',
        });
    }
    public async remove(
        message: RadonCommand.Message,
        args: RadonCommand.Args
    ) {
        const id = await args.pick('string').catch(() => null);
        if (!id) return send(message, `Please provide a valid ID.`);
        const reason = await this.container.settings.blacklists.remove(id);
        if (!reason) return send(message, `That guild isn't blacklisted.`);
        send(message, `Blacklist removed from \`${id}\``);
        const channel = this.container.client.channels.cache.get(
            '950646836471947294'
        ) as TextChannel;
        if (!channel) return;
        const webhook = (await channel.fetchWebhooks()).first();
        if (!webhook || !webhook.token) return;
        const description = `Guild ID: \`${id}\`\nReason: ${
            reason ?? `Unknown`
        }`;
        return webhook.send({
            embeds: [
                {
                    color: color.System,
                    description,
                    timestamp: Date.now(),
                },
            ],
            username: 'Radon Unblacklists',
            avatarURL: this.container.client.user?.displayAvatarURL() ?? '',
        });
    }
}
