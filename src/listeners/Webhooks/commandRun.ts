import { RadonEvents } from '#lib/types';
// import { Owners } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, ChatInputCommandInteraction } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ChatInputCommandRun
})
export class UserListener extends Listener {
	public override async run(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		// if (Owners.includes(interaction.user.id)) return;

		const channel = await this.container.client.channels.fetch('988318368555749406').catch(() => null);
		if (!channel || channel.type !== ChannelType.GuildText) return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook?.token) return;

		// Build command name with subcommands
		let fullCommand = interaction.commandName;
		const subcommandGroup = interaction.options.data.find((opt) => opt.type === 2);
		const subcommand = interaction.options.data.find((opt) => opt.type === 1);

		if (subcommandGroup) {
			fullCommand += ` ${subcommandGroup.name}`;
			const nestedSubcommand = subcommandGroup.options?.find((opt) => opt.type === 1);
			if (nestedSubcommand) fullCommand += ` ${nestedSubcommand.name}`;
		} else if (subcommand) {
			fullCommand += ` ${subcommand.name}`;
		}

		// Format command arguments
		const options = interaction.options.data;
		let args = '';
		if (options.length > 0) {
			const extractOptions = (opts: readonly any[]): string[] => {
				return opts
					.filter((opt) => opt.type !== 1 && opt.type !== 2) // Exclude subcommands
					.map((opt) => {
						const value = opt.value !== undefined ? opt.value : opt.user?.tag || opt.channel?.name || opt.role?.name || 'unknown';
						return `\`${opt.name}: ${value}\``;
					});
			};

			if (subcommandGroup) {
				const nestedSubcommand = subcommandGroup.options?.find((opt) => opt.type === 1);
				args = nestedSubcommand?.options ? extractOptions(nestedSubcommand.options).join(', ') : '';
			} else if (subcommand) {
				args = subcommand.options ? extractOptions(subcommand.options).join(', ') : '';
			} else {
				args = extractOptions(options).join(', ');
			}
		}

		const content = [
			`**User ID:** \`${interaction.user.id}\``,
			`**Command:** \`/${fullCommand}\``,
			args ? `**Arguments:** ${args}` : null,
			`**Guild:** ${interaction.guild.name} (\`${interaction.guild.id}\`)`
		]
			.filter(Boolean)
			.join('\n');

		return webhook.send({
			username: interaction.user.username,
			content,
			avatarURL: interaction.user.displayAvatarURL() ?? interaction.client.user!.displayAvatarURL()
		});
	}
}
