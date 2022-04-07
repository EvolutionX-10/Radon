import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { color } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { MessageActionRow, MessageButton } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	permissionLevel: PermissionLevels.Everyone,
	description: `Invite Radon to your server!`
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const invite = this.container.client.generateInvite({
			scopes: ['applications.commands', 'bot'],
			permissions: BigInt(543276137727)
		});
		const row = new MessageActionRow().addComponents(
			new MessageButton().setLabel(`Invite Link`).setStyle('LINK').setURL(invite),

			new MessageButton().setLabel(`Support`).setStyle('LINK').setURL(`https://discord.gg/YBFaDggpvt`)
		);
		await interaction.reply({
			embeds: [
				{
					title: 'Invite Radon to your server!',
					color: color.General,
					thumbnail: {
						url: this.container.client.user?.avatarURL() ?? undefined
					}
				}
			],
			ephemeral: true,
			components: [row]
		});
	}
	public override async registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description
			},
			{
				guildIds: vars.guildIds,
				idHints: ['950970064247607336', '951679294273388565']
			}
		);
	}
}
