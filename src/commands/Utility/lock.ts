import { v2 } from '../../lib/presentation/components.js';
import { PermissionLevel } from '#lib/decorators';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import { ChannelType, PermissionFlagsBits, InteractionContextType } from 'discord.js';
import { beginLockPrompt } from '../../lib/locks/interaction.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Lock channels and preserve their previous permissions',
	permissionLevel: PermissionLevels.Moderator,
	cooldownDelay: sec(30),
	cooldownScope: BucketScope.Guild,
	requiredClientPermissions: ['ManageRoles'],
	cooldownLimit: 3
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const scope = [interaction.options.getSubcommandGroup(false), interaction.options.getSubcommand()].filter(Boolean).join(' ');
		switch (scope) {
			case 'text':
				return this.lockText(interaction);
			case 'voice':
				return this.lockVoice(interaction);
			case 'category':
				return this.lockCategory(interaction);
			case 'thread':
				return this.lockThread(interaction);
			case 'all text':
				return this.lockAllText(interaction);
			case 'all voice':
				return this.lockAllVoice(interaction);
			case 'all thread':
				return this.lockAllThread(interaction);
			case 'server':
				return this.lockServer(interaction);
			default:
				return interaction.reply(v2('Unknown lock operation.', 'Radon · Lock'));
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles)
					.addSubcommand((builder) =>
						builder //
							.setName('text')
							.setDescription('Lock a text channel')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription('The channel to lock')
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildText)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to lock the channel for (defaults to @everyone)')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('voice')
							.setDescription('Lock a voice channel')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription('The channel to lock')
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildVoice)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to lock the channel for (defaults to @everyone)')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('category')
							.setDescription('Lock all channels under category')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription("The category who's channels to lock")
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildCategory)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to lock the channel for (defaults to @everyone)')
									.setRequired(false)
							)
							.addBooleanOption((option) =>
								option //
									.setName('threads')
									.setDescription('Whether to lock all threads in the category (defaults to false)')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('thread')
							.setDescription('Lock a thread')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription('The channel to lock')
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildNewsThread, ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread)
							)
					)
					.addSubcommandGroup((builder) =>
						builder //
							.setName('all')
							.setDescription('Lock all channels')
							.addSubcommand((builder) =>
								builder //
									.setName('text')
									.setDescription('Lock all text channels')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to lock the channel for (defaults to @everyone)')
											.setRequired(false)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('voice')
									.setDescription('Lock all voice channels')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to lock the channel for (defaults to @everyone)')
											.setRequired(false)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('thread')
									.setDescription('Lock all threads')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to lock the channel for (defaults to @everyone)')
											.setRequired(false)
									)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('server')
							.setDescription('Lock all channels in the server')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to lock the server for (defaults to @everyone)')
									.setRequired(false)
							)
							.addBooleanOption((option) =>
								option //
									.setName('deep')
									.setDescription('Whether to override channel overwrites, takes more time (defaults to false)')
									.setRequired(false)
							)
					),
			{ idHints: ['978320030452297769', '1019932088364978186'] }
		);
	}

	private lockText(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'text');
	}

	private lockVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'voice');
	}

	private lockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'category');
	}

	private lockThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'thread');
	}

	@PermissionLevel('Administrator', 'all text')
	private lockAllText(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'all text');
	}

	@PermissionLevel('Administrator', 'all voice')
	private lockAllVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'all voice');
	}

	@PermissionLevel('Administrator', 'all thread')
	private lockAllThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'all thread');
	}

	@PermissionLevel('Administrator', 'server')
	private lockServer(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'lock', 'server');
	}
}
