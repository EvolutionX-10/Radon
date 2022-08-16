import { RadonEvents } from '#lib/types';
import { Owners } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ChatInputCommandRun
})
export class UserListener extends Listener {
	public override async run(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		if (Owners.includes(interaction.user.id)) return;

		const channel = await this.container.client.channels.fetch('988318368555749406').catch(() => null);
		if (!channel || channel.type !== 'GUILD_TEXT') return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook?.token) return;

		const content = `${interaction.user.tag} used the command __${interaction.commandName}__ in *"${interaction.guild.name}"*`;

		return webhook.send({
			username: interaction.user.username,
			content,
			avatarURL: interaction.user.displayAvatarURL() ?? this.container.client.user?.displayAvatarURL() ?? ''
		});
	}
}
