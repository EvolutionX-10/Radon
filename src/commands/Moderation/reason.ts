import { RadonCommand } from '#lib/structures';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, TextChannel } from 'discord.js';
@ApplyOptions<RadonCommand.Options>({
	description: `Change the reason for the action`,
	runIn: `GUILD_ANY`
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		const id = interaction.options.getString('id', true);
		const reason = interaction.options.getString('reason', true);
		if (!interaction.guild) return;
		const channelID = await interaction.guild.settings?.modlogs.modLogs_exist();
		if (!channelID) {
			return interaction.editReply({
				content: `The modlogs aren't set up for this server.\nPlease inform admins to use \`/setup\``
			});
		}
		const channel = (await interaction.guild.channels.fetch(channelID).catch(() => null)) as TextChannel;
		if (!channel) {
			return interaction.editReply({
				content: `The modlogs channel seems to be deleted.\nPlease inform admins to use \`/setup\``
			});
		}
		const message = await channel.messages.fetch(id).catch(() => null);
		if (!message) {
			return interaction.editReply({
				content: `The message seems to be deleted or the ID is invalid!`
			});
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (message.author.id !== this.container.client.user!.id) {
			return interaction.editReply({
				content: `This message isn't from me!`
			});
		}
		const regex = /(\*\*Reason\*\*: )(?:.+)/gim;
		if (!message.embeds[0].description) return;
		message.embeds[0].description = message.embeds[0].description?.replace(regex, `$1${reason}`);
		await message.edit({
			embeds: message.embeds
		});
		if (message.embeds[0].description.includes('**Action**: Warn')) {
			//todo add a check for the warn id and update reason
		}
		return interaction.editReply({
			content: `Successfully updated the reason!`
		});
	}

	public override async registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'id',
						description: `The ID of the message in the modlogs`,
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: true
					},
					{
						name: 'reason',
						description: `The updated reason for the action`,
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: true
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['952460616696741938', '952277309015093288']
			}
		);
	}
}
