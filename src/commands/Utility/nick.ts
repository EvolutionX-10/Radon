import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember } from 'discord.js';
import { banish } from '@favware/zalgo';
@ApplyOptions<RadonCommand.Options>({
    description: `Manage nicknames`,
    requiredClientPermissions: ['MANAGE_NICKNAMES'],
    permissionLevel: PermissionLevels.Moderator,
    runIn: 'GUILD_ANY',
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        interaction: RadonCommand.ChatInputCommandInteraction
    ) {
        const subcmd = interaction.options.getSubcommand();
        switch (subcmd) {
            case 'set':
                return this.set(interaction);
            case 'clear':
                return this.clear(interaction);
            case 'decancer':
                return this.decancer(interaction);
            default:
                return interaction.reply({
                    content: `Error: \`${subcmd}\`\nPlease report this in the support server`,
                    ephemeral: true,
                });
        }
    }
    public async contextMenuRun(
        interaction: RadonCommand.ContextMenuCommandInteraction
    ) {
        return this.decancer(interaction);
    }
    private async decancer(
        interaction:
            | RadonCommand.ChatInputCommandInteraction
            | RadonCommand.ContextMenuCommandInteraction
    ) {
        const member = (interaction.options.getMember('member') ||
            interaction.options.getMember('user')) as GuildMember;
        if (!member) {
            return interaction.reply({
                content: 'No member found',
                ephemeral: true,
            });
        }
        const reason = `Done by ${interaction.user.tag}`;
        if (member.id === interaction.guild?.ownerId) {
            return interaction.reply({
                content: 'I cannot decancer the owner of the server',
                ephemeral: true,
            });
        }
        const { result, content } = runAllChecks(
            interaction.member as GuildMember,
            member,
            'nickname decancer'
        );
        if (!result) {
            return interaction.reply({
                content,
                ephemeral: true,
            });
        }
        const name = member.displayName;
        const nickname = banish(name) ?? 'Moderated Nickname';
        if (nickname === name) {
            return interaction.reply({
                content: 'Nothing to decancer',
                ephemeral: true,
            });
        }
        await member.setNickname(nickname, reason);
        return interaction.reply(
            `${member.user.tag}'s display name has been decancered!`
        );
    }
    private async set(interaction: RadonCommand.ChatInputCommandInteraction) {
        const member = interaction.options.getMember('member') as GuildMember;
        if (!member) {
            return await interaction.reply({
                content: 'No member found',
                ephemeral: true,
            });
        }
        const nickname = interaction.options.getString('nickname', true);
        const reason =
            (interaction.options.getString('reason', false)
                ? interaction.options.getString('reason', false) +
                  ` (${interaction.user.tag})`
                : null) ?? `Done by ${interaction.user.tag}`;
        if (member.id === interaction.guild?.ownerId) {
            return await interaction.reply({
                content: 'I cannot set the nickname of the guild owner',
                ephemeral: true,
            });
        }
        const { result, content } = runAllChecks(
            interaction.member as GuildMember,
            member,
            'nickname set'
        );
        if (!result) {
            return await interaction.reply({
                content,
                ephemeral: true,
            });
        }
        if (member.displayName === nickname) {
            return await interaction.reply({
                content: `${member}'s display name is already set to ${nickname}`,
                ephemeral: true,
            });
        }
        await member.setNickname(nickname, reason);
        return await interaction.reply({
            content: `Nickname \`${nickname}\` set for ${member.user.tag}`,
        });
    }
    private async clear(interaction: RadonCommand.ChatInputCommandInteraction) {
        const member = interaction.options.getMember('member') as GuildMember;
        if (!member) {
            return await interaction.reply({
                content: 'No member found',
                ephemeral: true,
            });
        }
        const reason =
            (interaction.options.getString('reason', false)
                ? interaction.options.getString('reason', false) +
                  ` (${interaction.user.tag})`
                : null) ?? `Done by ${interaction.user.tag}`;
        if (member.id === interaction.guild?.ownerId) {
            return await interaction.reply({
                content: 'I cannot clear the nickname of the guild owner',
                ephemeral: true,
            });
        }
        const { result, content } = runAllChecks(
            interaction.member as GuildMember,
            member,
            'nickname clear'
        );
        if (!result) {
            return await interaction.reply({
                content,
                ephemeral: true,
            });
        }
        if (!member.nickname) {
            return await interaction.reply({
                content: `${member} does not have a nickname`,
                ephemeral: true,
            });
        }
        await member.setNickname(null, reason);
        return await interaction.reply({
            content: `Nickname cleared for ${member.user.tag}`,
        });
    }
    public async registerApplicationCommands(registry: RadonCommand.Registry) {
        registry.registerChatInputCommand(
            {
                name: this.name,
                description: this.description,
                options: [
                    {
                        name: 'decancer',
                        description: 'Decancer the username of the member',
                        type: Constants.ApplicationCommandOptionTypes
                            .SUB_COMMAND,
                        options: [
                            {
                                name: 'member',
                                description:
                                    "The member who's nickname to decancer",
                                type: Constants.ApplicationCommandOptionTypes
                                    .USER,
                                required: true,
                            },
                        ],
                    },
                    {
                        name: 'set',
                        description: 'Set a nickname for the member',
                        type: Constants.ApplicationCommandOptionTypes
                            .SUB_COMMAND,
                        options: [
                            {
                                name: 'member',
                                description: "The member who's nickname to set",
                                type: Constants.ApplicationCommandOptionTypes
                                    .USER,
                                required: true,
                            },
                            {
                                name: 'nickname',
                                description: 'The nickname to set',
                                type: Constants.ApplicationCommandOptionTypes
                                    .STRING,
                                required: true,
                            },
                            {
                                name: 'reason',
                                description:
                                    'The reason for the nickname change',
                                type: Constants.ApplicationCommandOptionTypes
                                    .STRING,
                                required: false,
                            },
                        ],
                    },
                    {
                        name: 'clear',
                        description: 'Clear the nickname of the member',
                        type: Constants.ApplicationCommandOptionTypes
                            .SUB_COMMAND,
                        options: [
                            {
                                name: 'member',
                                description:
                                    "The member who's nickname to clear",
                                type: Constants.ApplicationCommandOptionTypes
                                    .USER,
                                required: true,
                            },
                            {
                                name: 'reason',
                                description:
                                    'The reason for the nickname clear',
                                type: Constants.ApplicationCommandOptionTypes
                                    .STRING,
                                required: false,
                            },
                        ],
                    },
                ],
            },
            {
                guildIds: vars.guildIds,
                idHints: ['954251737290661939', '954226414759055400'],
            }
        );
        registry.registerContextMenuCommand(
            {
                name: 'Decancer',
                type: Constants.ApplicationCommandTypes.USER,
            },
            {
                guildIds: vars.guildIds,
                idHints: ['954251739077431346', '954249587047170048'],
            }
        );
    }
}
