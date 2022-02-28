import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import type { MessageCommand } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
@ApplyOptions<RadonCommand.Options>({
    aliases: ['slashies'],
    permissionLevel: PermissionLevels.BotOwner,
    hidden: true,
    guarded: true,
    runIn: 'GUILD_ANY',
})
export class UserCommand extends RadonCommand {
    public async messageRun(
        ...[message]: Parameters<MessageCommand['messageRun']>
    ) {
        if (!message.guild) return;
        const global =
            await this.container.client.application?.commands.fetch();
        const guild = await message.guild.commands.fetch();
        let content = ``;
        content += `**Global** Slashies\n\n`;
        global?.forEach((cmd) => {
            content += `${cmd.name} (${cmd.id})\n`;
        });
        content += `\n**Guild** Slashies \`[${message.guild.name}]\`\n\n`;
        guild?.forEach((cmd) => {
            content += `${cmd.name} (${cmd.id})\n`;
        });
        return await send(message, content);
    }
}
