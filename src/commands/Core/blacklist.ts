import { Color, RadonGuildId, TestServerGuildIds } from '#constants';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry } from '@sapphire/framework';
import type { AutocompleteInteraction, TextChannel } from 'discord.js';
import { MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	name: 'blacklist',
	description: `Blacklist a guild`,
	permissionLevel: PermissionLevels.BotOwner
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addSubcommand((subcmd) =>
						subcmd //
							.setName('add')
							.setDescription('Blacklist a guild')
							.addStringOption((option) =>
								option //
									.setName('id')
									.setDescription('The ID of the guild to blacklist')
									.setAutocomplete(true)
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('The reason for blacklisting the guild')
									.setRequired(true)
							)
							.addBooleanOption((option) =>
								option //
									.setName('force')
									.setDescription('Force blacklist the guild')
									.setRequired(false)
							)
					)
					.addSubcommand((subcmd) =>
						subcmd //
							.setName('remove')
							.setDescription('Remove a guild from the blacklist')
							.addStringOption((option) =>
								option //
									.setName('id')
									.setDescription('The ID of the guild to remove from the blacklist')
									.setAutocomplete(true)
									.setRequired(true)
							)
					),
			{
				guildIds: [...RadonGuildId, ...TestServerGuildIds],
				idHints: ['1535548110057644093', '1535548112012058644', '1535548113534722099']
			}
		);
	}

	public override async autocompleteRun(interaction: AutocompleteInteraction) {
		const focus = interaction.options.getFocused(true);
		const subcommand = interaction.options.data.find((opt) => opt.type === 1)?.name as Subcommand;
		if (focus.name !== 'id') return;

		if (subcommand === 'add') {
			const guilds = this.container.client.guilds.cache;
			const choices = guilds
				.sort((a, b) => (b.members.me?.joinedTimestamp ?? 0) - (a.members.me?.joinedTimestamp ?? 0))
				.map((guild) => ({ name: guild.name, value: guild.id }));
			const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focus.value.toLowerCase()));
			await interaction.respond(filtered.slice(0, 25));
		} else if (subcommand === 'remove') {
			const blacklistedGuilds = await this.container.settings.blacklists.getAll();
			const choices = blacklistedGuilds.map((guild) => ({ name: `${guild.id} - ${guild.reason}`, value: guild.id }));
			const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focus.value.toLowerCase()));
			await interaction.respond(filtered.slice(0, 25));
		}
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand(true) as Subcommand;

		switch (subcommand) {
			case 'add':
				return this.add(interaction);
			case 'remove':
				return this.remove(interaction);
			default:
				return interaction.reply({ content: 'Invalid subcommand.' });
		}
	}

	private async add(interaction: RadonCommand.ChatInputCommandInteraction) {
		const id = interaction.options.getString('id', true);
		const reason = interaction.options.getString('reason', true);
		const force = interaction.options.getBoolean('force') ?? false;

		const guild = await this.container.client.guilds.fetch(id).catch(() => null);
		if (!guild && !force) return interaction.reply({ content: `I can't find that guild.`, flags: MessageFlags.Ephemeral });

		if (force && !guild) {
			await this.container.settings.blacklists.add(id, reason);
			return interaction.reply({ content: `Guild with ID \`${id}\` has been blacklisted.` });
		}

		if (guild) {
			await guild.leave();
			const k = await guild?.settings?.blacklists.add(id, reason).catch(() => undefined);
			if (typeof k === 'undefined') console.log(`Could Not Save Blacklist for ${guild.name} (${id})`);
			await interaction.reply({ content: `Guild \`${guild.name}\` [\`${id}\`] has been blacklisted.` });
		}

		const channel = this.container.client.channels.cache.get('950646836471947294') as TextChannel;
		if (!channel) return;

		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook.token) return;

		const description = `Guild: ${guild?.name ?? ``} \`${id}\`\nReason: ${reason}`;
		return webhook.send({
			embeds: [
				{
					color: Color.System,
					thumbnail: {
						url: guild?.iconURL() ?? ''
					},
					description,
					timestamp: new Date().toISOString()
				}
			],
			username: 'Radon Blacklists',
			avatarURL: this.container.client.user?.displayAvatarURL() ?? ''
		});
	}

	private async remove(interaction: RadonCommand.ChatInputCommandInteraction) {
		const id = interaction.options.getString('id', true);

		const reason = await this.container.settings.blacklists.remove(id).catch(() => null);
		if (!reason) return interaction.reply({ content: `That guild isn't blacklisted.`, flags: MessageFlags.Ephemeral });

		await interaction.reply({ content: `Guild with ID \`${id}\` has been removed from the blacklist.\nBlacklist reason: ${reason}` });

		const channel = this.container.client.channels.cache.get('950646836471947294') as TextChannel;
		if (!channel) return;

		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook.token) return;

		const description = `Guild ID: \`${id}\`\nReason: ${reason ?? `Unknown`}`;
		return webhook.send({
			embeds: [
				{
					color: Color.System,
					description,
					timestamp: new Date().toISOString()
				}
			],
			username: 'Radon Unblacklists',
			avatarURL: this.container.client.user?.displayAvatarURL() ?? ''
		});
	}
}

type Subcommand = 'add' | 'remove';
