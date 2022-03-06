import { des } from '#lib/messages';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type {
    ApplicationCommandRegistry,
    ChatInputCommand,
} from '@sapphire/framework';
import { Constants } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    cooldownDelay: sec(10),
    cooldownLimit: 3,
    description: des.moderation.unban,
    permissionLevel: PermissionLevels.Moderator,
    requiredClientPermissions: ['BAN_MEMBERS'],
    runIn: 'GUILD_ANY',
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        ...[interaction]: Parameters<ChatInputCommand['chatInputRun']>
    ) {
        if (!interaction.guild) return;
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || undefined;
        const ban = await interaction.guild.bans
            .fetch(user.id)
            .catch(() => null);
        if (!ban)
            return await interaction.reply({
                content: `${vars.emojis.cross} ${user} [${user.username}] is not banned!`,
                ephemeral: true,
            });

        let content =
            `${vars.emojis.confirm} ${user} [${user.username}] has ` +
            `been unbanned ${
                reason ? `for the following reason: ${reason}` : ''
            }`;
        await interaction.guild.bans.remove(user, reason);
        //* Sending DM to the user
        await user
            .send({
                content:
                    `You have been unbanned from ${interaction.guild.name}` +
                    `\n${reason ? `Reason: ${reason}` : ''}`,
            })
            .catch(
                () => (content += `\n${vars.emojis.cross} Couldn't DM user!`)
            );

        return interaction.reply({
            content,
            ephemeral: true,
        });
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
                        name: 'user',
                        description: 'The id of the user to unban',
                        type: Constants.ApplicationCommandOptionTypes.USER,
                        required: true,
                    },
                    {
                        name: 'reason',
                        description: 'The reason for the ban uplift',
                        type: Constants.ApplicationCommandOptionTypes.STRING,
                        required: false,
                    },
                ],
            },
            {
                guildIds: vars.guildIds,
                idHints: ['947830619386302525', '947808233131757578'],
            }
        );
    }
}
