import { Emojis } from '#constants';
import { Confirmation, RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { mentionCommand, mins } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import {
	ApplicationCommand,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	heading,
	MessageFlags,
	SectionBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder
} from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	name: 'slash',
	description: 'Manage application commands',
	permissionLevel: PermissionLevels.BotOwner
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const commands = await this.getCommands(interaction);
		let page = 1;
		let context: BaseCommandContext = 'global';
		let type: Exclude<ApplicationCommandType, ApplicationCommandType.PrimaryEntryPoint> = ApplicationCommandType.ChatInput;

		const response = await interaction.reply({
			components: [this.buildContainer(commands[context][type], page, context, type)],
			flags: MessageFlags.IsComponentsV2,
			withResponse: true
		});

		const collector = response.resource?.message?.createMessageComponentCollector({
			time: mins(5),
			filter: (i) => i.user.id === interaction.user.id
		});
		if (!collector) return void interaction.followUp('Collector creation failed');

		collector.on('collect', async (i) => {
			await i.deferUpdate();
			if (i.customId.startsWith('delete-')) {
				const cmdId = i.customId.split('-')[1];
				const cmd = commands[context][type].find((c) => c.id === cmdId);
				if (!cmd) return void i.followUp({ content: 'Command not found', flags: MessageFlags.Ephemeral });

				return void new Confirmation({
					onConfirm: async ({ i: _i }) => {
						await cmd.delete();
						commands[context][type] = commands[context][type].filter((c) => c.id !== cmdId);
						await i.editReply({
							components: [this.buildContainer(commands[context][type], page, context, type)],
							flags: MessageFlags.IsComponentsV2
						});
						return _i.editReply(`Deleted ${mentionCommand(cmd)} *(${cmd.id})*`);
					},
					onCancel: ({ i: _i }) => {
						return _i.editReply(`Cancelled deletion of ${mentionCommand(cmd)} *(${cmd.id})*`);
					},
					content: `Are you sure you want to delete ${mentionCommand(cmd)} *(${cmd.id})*?`,
					ephemeral: true
				}).run(i);
			}

			if (i.customId === 'start') {
				page = 1;
			} else if (i.customId === 'prev') {
				page = Math.max(1, page - 1);
			} else if (i.customId === 'next') {
				page = Math.min(Math.ceil(commands[context][type].length / 5), page + 1);
			} else if (i.customId === 'end') {
				page = Math.ceil(commands[context][type].length / 5);
			} else if (i.customId === 'command-context') {
				const selected = (i as StringSelectMenuInteraction<'cached'>).values[0] as BaseCommandContext;
				if (selected !== context) {
					context = selected;
					page = 1;
				}
				if (commands[context][type].length === 0) {
					return void i.followUp({ content: `No commands found for the selected context and type.`, flags: MessageFlags.Ephemeral });
				}
			} else if (i.customId === 'command-type') {
				const selected = (i as StringSelectMenuInteraction<'cached'>).values[0] as unknown as Exclude<
					ApplicationCommandType,
					ApplicationCommandType.PrimaryEntryPoint
				>;
				if (selected !== type) {
					type = selected;
					page = 1;
				}
				if (commands[context][type].length === 0) {
					return void i.followUp({ content: `No commands found for the selected context and type.`, flags: MessageFlags.Ephemeral });
				}
			}

			await i.editReply({
				components: [this.buildContainer(commands[context][type], page, context, type)],
				flags: MessageFlags.IsComponentsV2
			});
		});

		collector.on('ignore', (i) => {
			i.reply({
				content: 'Unauthorized!',
				flags: MessageFlags.Ephemeral
			});
		});
	}

	private buildContainer(
		commands: ApplicationCommand[],
		page: number,
		context: BaseCommandContext,
		type: Exclude<ApplicationCommandType, ApplicationCommandType.PrimaryEntryPoint>
	) {
		const container = new ContainerBuilder();
		const startIdx = (page - 1) * 5;
		const endIdx = startIdx + 5;
		const currentCmds = commands.slice(startIdx, endIdx);

		container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`${heading('Command Manager')}`));
		container.addSeparatorComponents((s) => s);

		currentCmds.forEach((cmd) => {
			container.addSectionComponents((_) => this.buildSection(cmd));
		});
		container.addSeparatorComponents((s) => s);

		// add pagination buttons
		const start = new ButtonBuilder().setCustomId('start').setStyle(ButtonStyle.Secondary).setEmoji(Emojis.Backward);
		const prev = new ButtonBuilder().setCustomId('prev').setStyle(ButtonStyle.Secondary).setEmoji(Emojis.Left);
		const pageNum = new ButtonBuilder()
			.setCustomId('page')
			.setStyle(ButtonStyle.Secondary)
			.setLabel(`Page ${page} / ${Math.ceil(commands.length / 5)}`)
			.setDisabled(true);
		const next = new ButtonBuilder().setCustomId('next').setStyle(ButtonStyle.Secondary).setEmoji(Emojis.Right);
		const end = new ButtonBuilder().setCustomId('end').setStyle(ButtonStyle.Secondary).setEmoji(Emojis.Forward);

		container.addActionRowComponents((row) => row.setComponents(start, prev, pageNum, next, end));

		const selectMenuCommandContext = new StringSelectMenuBuilder() //
			.setCustomId('command-context')
			.setPlaceholder('Select a command context')
			.addOptions(
				new StringSelectMenuOptionBuilder() //
					.setLabel('Global')
					.setValue('global')
					.setDefault(context === 'global'),
				new StringSelectMenuOptionBuilder() //
					.setLabel('Guild')
					.setValue('guild')
					.setDefault(context === 'guild')
			);

		const selectMenuCommandType = new StringSelectMenuBuilder() //
			.setCustomId('command-type')
			.setPlaceholder('Select a command type')
			.addOptions(
				new StringSelectMenuOptionBuilder() //
					.setLabel('Slash Commands')
					.setValue(ApplicationCommandType.ChatInput.toString())
					.setDefault(type.toString() === ApplicationCommandType.ChatInput.toString()),
				new StringSelectMenuOptionBuilder() //
					.setLabel('User Context Menu Commands')
					.setValue(ApplicationCommandType.User.toString())
					.setDefault(type.toString() === ApplicationCommandType.User.toString()),
				new StringSelectMenuOptionBuilder() //
					.setLabel('Message Context Menu Commands')
					.setValue(ApplicationCommandType.Message.toString())
					.setDefault(type.toString() === ApplicationCommandType.Message.toString())
			);

		container.addSeparatorComponents((s) => s);
		container.addActionRowComponents((actionRow) => actionRow.addComponents(selectMenuCommandContext));
		container.addActionRowComponents((actionRow) => actionRow.addComponents(selectMenuCommandType));

		return container;
	}

	private buildSection(command: ApplicationCommand) {
		return new SectionBuilder()
			.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`${mentionCommand(command)}`))
			.setButtonAccessory((button) => button.setLabel('Delete').setStyle(ButtonStyle.Danger).setCustomId(`delete-${command.id}`));
	}

	private async getCommands(interaction: RadonCommand.ChatInputCommandInteraction) {
		const obj: Record<
			BaseCommandContext,
			Record<Exclude<ApplicationCommandType, ApplicationCommandType.PrimaryEntryPoint>, ApplicationCommand[]>
		> = {
			global: {
				[ApplicationCommandType.ChatInput]: [],
				[ApplicationCommandType.User]: [],
				[ApplicationCommandType.Message]: []
			},
			guild: {
				[ApplicationCommandType.ChatInput]: [],
				[ApplicationCommandType.User]: [],
				[ApplicationCommandType.Message]: []
			}
		};

		const globalCmds = await (await interaction.client.application?.fetch())?.commands.fetch();
		if (!globalCmds) throw new Error('Could not fetch commands');

		const items = [ApplicationCommandType.ChatInput, ApplicationCommandType.Message, ApplicationCommandType.User] as const;

		for (const item of items) {
			obj.global[item].push(...globalCmds.filter((cmd) => cmd.type === item).values());
		}

		const guildCmds = await interaction.guild.commands.fetch();
		if (!guildCmds) throw new Error('Could not fetch commands');

		for (const item of items) {
			obj.guild[item].push(...guildCmds.filter((cmd) => cmd.type === item).values());
		}

		return obj;
	}
}

type BaseCommandContext = 'global' | 'guild';
