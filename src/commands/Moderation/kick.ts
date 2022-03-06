import { des } from '#lib/messages';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type {
    ApplicationCommandRegistry,
    ChatInputCommand,
} from '@sapphire/framework';
import { Constants, GuildMember } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    description: des.moderation.kick,
    permissionLevel: PermissionLevels.Moderator,
    runIn: 'GUILD_ANY',
    cooldownDelay: sec(10),
    cooldownLimit: 3,
    requiredClientPermissions: ['KICK_MEMBERS'],
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        ...[interaction]: Parameters<ChatInputCommand['chatInputRun']>
    ) {
        if (!interaction.guild) return;
        const member = interaction.options.getMember('member') as GuildMember;
        const reason = interaction.options.getString('reason') as string;
        const { content: ctn, result } = runAllChecks(
            interaction.member as GuildMember,
            member,
            'kick'
        );
        if (!result)
            return await interaction.reply({ content: ctn, ephemeral: true });
        let content = `${vars.emojis.confirm} ${member} [${
            member.user.username
        }] has been kicked ${
            reason ? `for the following reason: ${reason}` : ''
        }`;
        await member
            .send({
                content: `You have been kicked from ${member.guild.name} ${
                    reason ? `for the following reason: ${reason}` : ''
                }`,
            })
            .catch(
                () =>
                    (content += `\n||${vars.emojis.cross} Couldn't DM ${member}||`)
            );
        const kicked = await member.kick(reason).catch(() => null);
        if (!kicked)
            return await interaction.reply({
                content: `Kick failed`,
                ephemeral: true,
            });
        await interaction.reply({
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
                        name: 'member',
                        description: 'The member to kick',
                        type: Constants.ApplicationCommandOptionTypes.USER,
                        required: true,
                    },
                    {
                        name: 'reason',
                        description: 'The reason for the kick',
                        type: Constants.ApplicationCommandOptionTypes.STRING,
                        required: false,
                    },
                ],
            },
            {
                guildIds: vars.guildIds,
                idHints: ['947723984949092392', '947165797590126642'],
            }
        );
    }
}
