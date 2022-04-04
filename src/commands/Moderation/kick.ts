import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import {
    generateModLogDescription,
    runAllChecks,
    sec,
    severity,
} from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember, MessageEmbed } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    description: `Kick a member`,
    permissionLevel: PermissionLevels.Moderator,
    runIn: 'GUILD_ANY',
    cooldownDelay: sec(10),
    cooldownLimit: 3,
    requiredClientPermissions: ['KICK_MEMBERS'],
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        interaction: RadonCommand.ChatInputCommandInteraction
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
        const embed = new MessageEmbed().setColor(severity.kick).setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        });
        const description = generateModLogDescription({
            member,
            action: 'Kick',
            reason: reason ?? undefined,
        });
        embed.setDescription(description);
        if (
            interaction.guild &&
            (await interaction.guild.settings?.modlogs.modLogs_exist()) &&
            kicked
        ) {
            await interaction.guild.settings?.modlogs.sendModLog(embed);
        }
    }
    public async registerApplicationCommands(registry: RadonCommand.Registry) {
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
                idHints: ['947723984949092392', '951679380692828180'],
            }
        );
    }
}
