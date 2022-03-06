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
    cooldownDelay: sec(10),
    cooldownLimit: 3,
    description: des.moderation.softban,
    permissionLevel: PermissionLevels.Moderator,
    requiredClientPermissions: ['BAN_MEMBERS'],
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
                content: `${vars.emojis.cross} You must specify a valid member`,
            });
        const reason = interaction.options.getString('reason');
        const days = interaction.options.getInteger('days');
        const { content: ctn, result } = runAllChecks(
            interaction.member as GuildMember,
            member,
            'soft ban'
        );
        if (!result) return await interaction.editReply(ctn);
        const content =
            `${vars.emojis.confirm} ${member} [${member.user.username}] has ` +
            `been soft banned ${
                reason ? `for the following reason: ${reason}` : ''
            }`;
        const id = member.id;
        await member.ban({
            days: days ?? 1,
            reason: reason ?? undefined,
        });
        await interaction.guild.members.unban(id, reason ?? undefined);
        return interaction.editReply(content);
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
                        description: 'The member to soft ban',
                        type: Constants.ApplicationCommandOptionTypes.USER,
                        required: true,
                    },
                    {
                        name: 'reason',
                        description: 'The reason for the soft ban',
                        type: Constants.ApplicationCommandOptionTypes.STRING,
                        required: false,
                    },
                    {
                        name: 'days',
                        description:
                            'The days of messages to delete (not a temp ban)',
                        type: Constants.ApplicationCommandOptionTypes.INTEGER,
                        maxValue: 7,
                        minValue: 1,
                        required: false,
                    },
                ],
            },
            {
                guildIds: vars.guildIds,
                idHints: ['948096163398160415', '948090347974692895'],
            }
        );
    }
}
