import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type {
    ApplicationCommandRegistry,
    ChatInputCommand,
} from '@sapphire/framework';
import { Constants, GuildMember } from 'discord.js';
import ms from 'ms';
import hd from 'humanize-duration';

@ApplyOptions<RadonCommand.Options>({
    description: `Temporarily mute a member`,
    permissionLevel: PermissionLevels.Moderator,
    requiredClientPermissions: ['MODERATE_MEMBERS'],
    runIn: 'GUILD_ANY',
})
export class UserCommand extends RadonCommand {
    public async chatInputRun(
        ...[interaction]: Parameters<ChatInputCommand['chatInputRun']>
    ) {
        if (!interaction.guild) return;
        await interaction.deferReply({ ephemeral: true, fetchReply: true });
        const member = interaction.options.getMember('member') as GuildMember;
        if (!member)
            return await interaction.editReply({
                content: 'No member found!',
            });
        const { content: ctn, result } = runAllChecks(
            interaction.member as GuildMember,
            member,
            'timeout'
        );
        if (!result)
            return await interaction.editReply({
                content: ctn,
            });
        let time = interaction.options.getString('duration', true);
        if (!isNaN(+time)) time = time + 's';
        const duration = ms(time);
        if (isNaN(duration))
            return await interaction.editReply({
                content:
                    'Invalid duration! Valid examples: `1d`, `1h`, `1m`, `1s`\nTo remove a timeout' +
                    ' just put `0` as the duration.',
            });
        if (duration > 2419200000) {
            return await interaction.editReply({
                content: 'You cannot timeout a user for more than 28 days!',
            });
        }
        let content = `${vars.emojis.confirm} ${member} [${
            member.user.tag
        }] has been timed out for ${hd(duration, { round: true })}`;
        const reason = interaction.options.getString('reason') || undefined;
        await member.timeout(duration, reason);
        if (duration !== 0) {
            await member
                .send({
                    content: `You have been timed out for ${hd(duration, {
                        round: true,
                    })}!\nServer: ${interaction.guild.name}`,
                })
                .catch(
                    () =>
                        (content += `\n${vars.emojis.cross} Couldn't DM the member!`)
                );
        }
        if (duration === 0)
            content = `${vars.emojis.confirm} Removed timeout from ${member} [${member.user.tag}]`;
        return await interaction.editReply({
            content,
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
                        description: `The member to timeout`,
                        type: Constants.ApplicationCommandOptionTypes.USER,
                        required: true,
                    },
                    {
                        name: 'duration',
                        description: `The duration of the timeout`,
                        type: Constants.ApplicationCommandOptionTypes.STRING,
                        required: true,
                    },
                    {
                        name: 'reason',
                        description: `The reason for the timeout`,
                        type: Constants.ApplicationCommandOptionTypes.STRING,
                        required: false,
                    },
                ],
            },
            {
                guildIds: vars.guildIds,
                idHints: ['948096165017169943', '947884711865376868'],
            }
        );
    }
}
