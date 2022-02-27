import { des } from '#lib/messages';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import {
    ApplicationCommandRegistry,
    ChatInputCommand,
    RegisterBehavior,
} from '@sapphire/framework';
import { Constants, GuildMember } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
    description: des.moderation.kick,
    permissionLevel: PermissionLevels.Moderator,
    runIn: 'GUILD_ANY',
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        ...[interaction]: Parameters<ChatInputCommand['chatInputRun']>
    ) {
        const member = interaction.options.getMember('member') as GuildMember;
        const reason = interaction.options.getString('reason') as string;
        if (!member.kickable || !member.manageable) {
            return await interaction.reply({
                content: `${vars.emojis.cross} You can't kick ${member}`,
                ephemeral: true,
            });
        }
        let content = `${vars.emojis.confirm}${
            member.user.tag
        } has been kicked ${
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
                    (content += `\n${vars.emojis.cross} Couldn't DM ${member.user.tag}`)
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
                behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
                guildIds: vars.guildIds,
                idHints: ['946381623207804978', '947165797590126642'],
            }
        );
    }
}
