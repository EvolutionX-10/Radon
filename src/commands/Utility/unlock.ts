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
	description: 'Restore permissions saved before locking',
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
				return this.unlockText(interaction);
			case 'voice':
				return this.unlockVoice(interaction);
			case 'category':
				return this.unlockCategory(interaction);
			case 'thread':
				return this.unlockThread(interaction);
			case 'all text':
				return this.unlockAllText(interaction);
			case 'all voice':
				return this.unlockAllVoice(interaction);
			case 'all thread':
				return this.unlockAllThread(interaction);
			case 'server':
				return this.unlockServer(interaction);
			default:
				return interaction.reply(v2('Unknown lock operation.', 'Radon · Unlock'));
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
							.setDescription('Unlock a text channel')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription('The channel to unlock')
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildText)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to unlock the channel for (defaults to @everyone)')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('voice')
							.setDescription('Unlock a voice channel')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription('The channel to unlock')
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildVoice)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to unlock the channel for (defaults to @everyone)')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('category')
							.setDescription('Unlock all channels under category')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription("The category who's channels to unlock")
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildCategory)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to unlock the channel for (defaults to @everyone)')
									.setRequired(false)
							)
							.addBooleanOption((option) =>
								option //
									.setName('threads')
									.setDescription('Whether to unlock all threads in the category (defaults to false)')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('thread')
							.setDescription('Unlock a thread')
							.addChannelOption((option) =>
								option //
									.setName('channel')
									.setDescription('The channel to unlock')
									.setRequired(true)
									.addChannelTypes(ChannelType.GuildNewsThread, ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread)
							)
					)
					.addSubcommandGroup((builder) =>
						builder //
							.setName('all')
							.setDescription('Unlock all channels')
							.addSubcommand((builder) =>
								builder //
									.setName('text')
									.setDescription('Unlock all text channels')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to unlock the channel for (defaults to @everyone)')
											.setRequired(false)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('voice')
									.setDescription('Unlock all voice channels')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to unlock the channel for (defaults to @everyone)')
											.setRequired(false)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('thread')
									.setDescription('Unlock all threads')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to unlock the channel for (defaults to @everyone)')
											.setRequired(false)
									)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('server')
							.setDescription('Unlock all channels in the server')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to unlock the server for (defaults to @everyone)')
									.setRequired(false)
							)
							.addBooleanOption((option) =>
								option //
									.setName('deep')
									.setDescription('Whether to override channel overwrites, only use if lock was deep (defaults to false)')
									.setRequired(false)
							)
					),
			{ idHints: ['978320032541081662', '1019932180958412840'] }
		);
	}

	private unlockText(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'text');
	}

	private unlockVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'voice');
	}

	private unlockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'category');
	}

	private unlockThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'thread');
	}

	@PermissionLevel('Administrator', 'all text')
	private unlockAllText(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'all text');
	}

	@PermissionLevel('Administrator', 'all voice')
	private unlockAllVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'all voice');
	}

	@PermissionLevel('Administrator', 'all thread')
	private unlockAllThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'all thread');
	}

	@PermissionLevel('Administrator', 'server')
	private unlockServer(interaction: RadonCommand.ChatInputCommandInteraction) {
		return beginLockPrompt(interaction, 'unlock', 'server');
	}
}
