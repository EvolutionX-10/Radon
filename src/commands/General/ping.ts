import { RadonCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Check my latency!`
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const interactionResponse = await interaction.reply({
			content: `Ping?`,
			flags: MessageFlags.Ephemeral,
			withResponse: true
		});
		const msg = interaction.channel?.messages.cache.get(interactionResponse.interaction.responseMessageId!) as RadonCommand.Message;
		const { diff, ping } = this.getPing(msg, interaction);

		return interaction.editReply({
			content: `Pong! (Roundtrip took: ${diff}ms. Heartbeat: ${ping}ms.)`
		});
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	private getPing(message: RadonCommand.Message, interaction: RadonCommand.ChatInputCommandInteraction) {
		const diff = (message.editedTimestamp || message.createdTimestamp) - interaction.createdTimestamp;
		const ping = Math.round(this.container.client.ws.ping);

		return { diff, ping };
	}
}
