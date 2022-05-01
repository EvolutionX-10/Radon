import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { color } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<RadonCommand.Options>({
	permissionLevel: PermissionLevels.Everyone,
	description: `Invite Radon to your server!`
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		return interaction.reply({
			content: 'Use /about me instead!',
			ephemeral: true
		});
		// @ts-ignore this method is deprecated
		// eslint-disable-next-line no-unreachable
		const invite = this.container.client.generateInvite({
			scopes: ['applications.commands', 'bot'],
			permissions: 543276137727n
		});
		const row = this.container.utils
			.row()
			._components(
				this.container.utils.button()._label(`Invite Link`)._style('LINK')._url(invite),
				this.container.utils.button()._label(`Support`)._style('LINK')._url(`https://discord.gg/YBFaDggpvt`)
			);

		const title = `Invite Radon to your server!`;
		const thumbnail = this.container.client.user!.displayAvatarURL();
		// TODO Add a proper embed and merge ping/invite/stats into about
		const embed = this.container.utils.embed()._title(title)._color(color.General)._thumbnail(thumbnail);

		return interaction.reply({
			embeds: [embed],
			components: [row]
		});
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
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
