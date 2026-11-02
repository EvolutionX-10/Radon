import { v2 } from '../../lib/presentation/components.js';
import { Emojis } from '#constants';
import { ModerationAction, RadonCommand } from '#lib/structures';
import { type BaseModActionData, PermissionLevels, RadonEvents } from '#lib/types';
import { runAllChecks, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { InteractionContextType } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Kick a member`,
	cooldownDelay: sec(10),
	cooldownLimit: 3,
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['KickMembers']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		const reason = interaction.options.getString('reason') ?? undefined;
		const dm = interaction.options.getBoolean('dm') ?? false;
		const reply = await interaction.deferReply({ withResponse: true });

		if (!member) {
			return interaction.editReply(
				v2(
					{
						content: `${Emojis.Cross} You must specify a valid member that is in this server!`
					},
					'Radon · Kick'
				)
			);
		}

		const { content: ctn, result } = runAllChecks(interaction.member, member, 'kick');
		if (!result) return interaction.editReply(v2({ content: ctn }, 'Radon · Kick'));

		let content = `${Emojis.Confirm} ${member.user.tag} has been kicked ${reason ? `for the following reason: ${reason}` : ''}`;

		const kicked = await new ModerationAction(interaction.guild)
			.invoke({ moderator: interaction.member, target: member, action: 'kick', reason })
			.catch((error) => {
				this.container.logger.error('Kick failed:', error);
				return null;
			});
		if (!kicked) {
			return interaction.editReply(
				v2(
					{
						content: `Kick failed due to missing permissions, please contact support server if this persists!`
					},
					'Radon · Kick'
				)
			);
		}

		if (dm) {
			await member
				.send(
					v2(
						{
							content: `You have been kicked from ${member.guild.name} ${reason ? `for the following reason: ${reason}` : ''}`
						},
						'Radon · Kick'
					)
				)
				.catch(() => (content += `\n\n> ${Emojis.Cross} Couldn't DM member!`));
		}

		const data: BaseModActionData = {
			moderator: interaction.member,
			target: member,
			action: 'kick',
			reason,
			url: reply.resource?.message?.url
		};

		this.container.client.emit(RadonEvents.ModAction, data);

		return interaction.editReply(v2(content, 'Radon · Kick'));
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
					.addUserOption((option) =>
						option //
							.setName('target')
							.setDescription('The target to kick')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('reason')
							.setDescription('The reason for the kick')
							.setRequired(false)
					)
					.addBooleanOption((option) =>
						option //
							.setName('dm')
							.setDescription('Send a DM to the kicked user (default: false)')
							.setRequired(false)
					),
			{ idHints: ['947723984949092392', '1019931917417730058'] }
		);
	}
}
