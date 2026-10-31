import { Prefixes } from '#constants';
import type { PermissionLevel } from '#lib/decorators';
import { RadonCommand } from '#lib/structures';
import { canUseApplicationCommand } from '../../lib/structures/help/applicationPermissions.js';
import { canDiscoverCommand, getApplicationHelpEntries } from '../../lib/structures/help/catalogue.js';
import { buildHelpContainer, getHelpCategories, getHelpPage, type HelpEntry, type HelpState } from '../../lib/structures/help/layout.js';
import { mins } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandType, InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	name: 'help',
	description: 'Browse the commands available to you in this channel'
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setContexts(InteractionContextType.Guild)
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		let entries: HelpEntry[];
		try {
			entries = await this.getEntries(interaction);
		} catch (error) {
			this.container.logger.error('Failed to build help catalogue', error);
			return interaction.editReply({ content: 'I could not load the command list. Please try /help again in a moment.' });
		}

		const state: HelpState = { category: 'all', page: 0 };
		const message = await interaction.editReply({
			components: [buildHelpContainer(entries, state)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] }
		});
		const collector = message.createMessageComponentCollector({ time: mins(5), filter: (i) => i.customId.startsWith('help:') });
		let pendingUpdate = Promise.resolve();
		const enqueue = (update: () => Promise<unknown>) => {
			pendingUpdate = pendingUpdate
				.then(update)
				.then(() => undefined)
				.catch((error) => {
					this.container.logger.error('Failed to update help pagination', error);
				});
			return pendingUpdate;
		};
		collector.on('collect', async (i) => {
			try {
				if (i.user.id !== interaction.user.id) {
					await i.reply({ content: 'Run /help to open your own command list.', flags: MessageFlags.Ephemeral });
					return;
				}
				// Acknowledge immediately; serialize edits so rapid clicks and expiry cannot race.
				await i.deferUpdate();
				await enqueue(async () => {
					if (collector.ended) return;
					const { pages } = getHelpPage(entries, state);
					if (i.isStringSelectMenu() && i.customId === 'help:category') {
						const selected = i.values[0];
						if (selected !== 'all' && !getHelpCategories(entries).includes(selected)) return;
						state.category = selected;
						state.page = 0;
					} else if (i.isButton()) {
						switch (i.customId) {
							case 'help:first':
								state.page = 0;
								break;
							case 'help:previous':
								state.page = Math.max(0, state.page - 1);
								break;
							case 'help:next':
								state.page = Math.min(pages - 1, state.page + 1);
								break;
							case 'help:last':
								state.page = pages - 1;
								break;
							default:
								return;
						}
					} else return;
					await i.editReply({ components: [buildHelpContainer(entries, state)], allowedMentions: { parse: [] } });
				});
			} catch (error) {
				this.container.logger.error('Failed to update help pagination', error);
			}
		});
		collector.on('end', () => {
			void enqueue(() => interaction.editReply({ components: [buildHelpContainer(entries, state, true)] }));
		});
		return message;
	}

	private async getEntries(interaction: RadonCommand.ChatInputCommandInteraction): Promise<HelpEntry[]> {
		const [globalCommands, guildCommands, permissions] = await Promise.all([
			interaction.client.application.commands.fetch(),
			interaction.guild.commands.fetch(),
			interaction.guild.commands.permissions.fetch({})
		]);
		// A guild registration takes precedence over a global registration with the same name and type.
		const registered = new Map(
			[...globalCommands.values(), ...guildCommands.values()].map((command) => [`${command.type}:${command.name}`, command])
		);
		const allowedLevels = new Set<PermissionLevel>(['Everyone']);
		for (const level of ['Moderator', 'Administrator', 'ServerOwner'] as const) {
			const precondition = this.container.stores.get('preconditions').get(level);
			const owner = this.container.stores.get('preconditions').get('BotOwner');
			if ((await owner?.chatInputRun?.(interaction, this, {}))?.isOk() || (await precondition?.chatInputRun?.(interaction, this, {}))?.isOk()) {
				allowedLevels.add(level);
			}
		}
		const entries: HelpEntry[] = [];
		for (const command of new Set(this.container.stores.get('commands').values())) {
			if (!(command instanceof RadonCommand) || !(await canDiscoverCommand(command, interaction))) continue;
			const registry = command.applicationCommandRegistry;
			for (const applicationCommand of registered.values()) {
				const names =
					applicationCommand.type === ApplicationCommandType.ChatInput ? registry.chatInputCommands : registry.contextMenuCommands;
				if (!names.has(applicationCommand.id) && !names.has(applicationCommand.name)) continue;
				if (!canUseApplicationCommand(applicationCommand, interaction, permissions)) continue;
				entries.push(...(await getApplicationHelpEntries(command, applicationCommand, allowedLevels, interaction)));
			}
			if (command.supportsMessageCommands()) {
				entries.push({
					name: `${Prefixes[0]}${command.name}`,
					description: command.description,
					category: command.category ?? 'General',
					usage: `${Prefixes[0]}${command.name} <arguments>`,
					details: `Message command. Aliases: ${command.aliases.join(', ') || 'none'}.`
				});
			}
		}
		return entries.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
	}
}
