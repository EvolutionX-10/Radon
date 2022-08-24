import { RadonCommand } from '#lib/structures';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
@ApplyOptions<RadonCommand.Options>({
	description: `Check my latency!`
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message) {
		const msg = await send(message, 'Ping?');
		const content = `Pong! (Roundtrip took: ${Math.round(
			(msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp)
		)}ms. Heartbeat: ${Math.round(this.container.client.ws.ping)}ms.)`;

		return send(message, content);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const msg = (await interaction.reply({
			content: `Ping?`,
			ephemeral: true,
			fetchReply: true
		})) as RadonCommand.Message;
		const { diff, ping } = this.getPing(msg, interaction);

		return interaction.editReply({
			content: `Pong! (Roundtrip took: ${diff}ms. Heartbeat: ${ping}ms.)`
		});
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description),
			{
				guildIds: vars.radonGuildId, // * Only run in Radon Support *
				idHints: ['961940451135479888', '951679296689287239']
			}
		);
	}

	private getPing(message: RadonCommand.Message, interaction: RadonCommand.ChatInputCommandInteraction) {
		const diff = (message.editedTimestamp || message.createdTimestamp) - interaction.createdTimestamp;
		const ping = Math.round(this.container.client.ws.ping);

		return { diff, ping };
	}
}
