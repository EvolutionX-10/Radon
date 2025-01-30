import { RadonCommand, Row } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle, InteractionContextType } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Change the reason for the action`,
	permissionLevel: PermissionLevels.Moderator
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const id = interaction.options.getString('id', true);

		const channelID = await interaction.guild.settings?.modlogs.modLogs_exist();
		if (!channelID) {
			return interaction.reply({
				content: `The modlogs aren't set up for this server.\nPlease inform admins to use </setup:951113445930065980>`
			});
		}

		const channel = (await interaction.guild.channels.fetch(channelID).catch(() => null)) as TextChannel;

		if (!channel) {
			return interaction.reply({
				content: `The modlogs channel seems to be deleted.\nPlease inform admins to use </setup:951113445930065980> to create new channel`
			});
		}

		const message = await channel.messages.fetch(id).catch(() => null);

		if (!message) {
			return interaction.editReply({
				content: `The message seems to be deleted or the ID is invalid!`
			});
		}

		if (message.author.id !== this.container.client.user!.id) {
			return interaction.editReply({
				content: `This message isn't from me hence I can't edit!`
			});
		}

		const modal = new ModalBuilder().setCustomId(`@reason/${channelID}/${id}`).setTitle('Edit Reason');

		const reasonInput = new TextInputBuilder()
			.setLabel('Reason')
			.setCustomId('reason')
			.setMaxLength(512)
			.setPlaceholder('Enter the new reason')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired();

		const row = new Row<TextInputBuilder>()._components(reasonInput);

		modal.setComponents(row);

		return interaction.showModal(modal);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts(InteractionContextType.Guild)
					.addStringOption((option) =>
						option //
							.setName('id')
							.setDescription('The ID of the message in the modlogs channel')
							.setRequired(true)
					),
			{ idHints: ['952460616696741938', '1019931919087054899'] }
		);
	}
}
