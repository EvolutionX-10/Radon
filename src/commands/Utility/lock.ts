import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import {
	CategoryChannel,
	Constants,
	GuildChannel,
	MessageActionRow,
	Modal,
	ModalActionRowComponent,
	Role,
	TextChannel,
	TextInputComponent,
	ThreadChannel
} from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Lock!',
	permissionLevel: PermissionLevels.Moderator,
	cooldownDelay: sec(30),
	cooldownScope: BucketScope.Guild,
	requiredClientPermissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
	runIn: ['GUILD_ANY'],
	cooldownLimit: 3
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subCmd = interaction.options.getSubcommand();
		const grp = interaction.options.getSubcommandGroup(false);
		if (grp) {
			switch (subCmd as group) {
				case 'text':
					return this.lockAllText(interaction);
			}
		}
		switch (subCmd as subcmd) {
			case 'text':
				return this.lockText(interaction);
			case 'voice':
				return this.lockVoice(interaction);
			case 'category':
				return this.lockCategory(interaction);
			case 'thread':
				return this.lockThread(interaction);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'text',
						description: 'Lock a text channel',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'channel',
								description: 'The channel to lock',
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								required: true,
								channelTypes: ['GUILD_TEXT']
							},
							{
								name: 'role',
								description: 'The role to lock the channel for (defaults to @everyone)',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: false
							}
						]
					},
					{
						name: 'voice',
						description: 'Lock a voice channel',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'channel',
								description: 'The channel to lock',
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								required: true,
								channelTypes: ['GUILD_VOICE']
							},
							{
								name: 'role',
								description: 'The role to lock the channel for (defaults to @everyone)',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: false
							}
						]
					},
					{
						name: 'category',
						description: 'Lock all channels under category',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'channel',
								description: "The category who's channels to lock",
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								channelTypes: ['GUILD_CATEGORY'],
								required: true
							},
							{
								name: 'role',
								description: 'The role to lock the channel for (defaults to @everyone)',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: false
							},
							{
								name: 'threads',
								description: 'Whether to lock all threads in the category (defaults to false)',
								type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
								required: false
							}
						]
					},
					{
						name: 'thread',
						description: 'Lock a thread',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'channel',
								description: 'The channel to lock',
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								required: true,
								channelTypes: ['GUILD_PUBLIC_THREAD', 'GUILD_NEWS_THREAD', 'GUILD_PRIVATE_THREAD']
							}
						]
					},
					{
						name: 'all',
						description: 'Lock all channels',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
						options: [
							{
								name: 'text',
								description: 'Lock all text channels',
								type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
								options: [
									{
										name: 'role',
										description: 'The role to lock the channel for (defaults to @everyone)',
										type: Constants.ApplicationCommandOptionTypes.ROLE,
										required: false
									}
								]
							}
						]
					}
				]
			},
			{
				guildIds: vars.radonGuildId.concat(['953175228899553312']),
				idHints: ['975669603403444224', '975667690498834482', '976055923191734312']
			}
		);
	}

	private lockText(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as TextChannel;
		if (!channel) return interaction.reply('Invalid channel!');
		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_ROLES'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		if (this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already locked for ${role}!`);

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for lock')
			.setPlaceholder(`This will be sent in #${channel.name} (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@lock/text');

		interaction.user.data = {
			content: `Locked channel <#${channel.id}> for ${role}`,
			channel,
			role
		};

		return interaction.showModal(modal);
	}

	private async lockVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as GuildChannel;
		if (!channel) return interaction.reply('Invalid channel!');
		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		if (this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already locked for ${role}!`);

		const update = await channel.permissionOverwrites
			.edit(
				role,
				{
					CONNECT: false,
					SPEAK: false
				},
				{
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				}
			)
			.catch(() => null);
		if (!update) return interaction.reply('Failed to lock channel!');

		return interaction.reply(`Locked <#${channel.id}> for ${role}!`);
	}

	private lockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		const category = interaction.options.getChannel('channel', true) as CategoryChannel;
		if (!category) return interaction.reply('Invalid category!');
		if (!category.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		const threads = interaction.options.getBoolean('threads') ?? false;

		const content = `Successfully locked __${category.name}__ for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for lock')
			.setPlaceholder(`This will be sent in ${category.name} (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@lock/category');

		interaction.user.data = {
			content,
			category,
			role,
			threads
		};

		return interaction.showModal(modal);
	}

	private lockThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		const thread = interaction.options.getChannel('channel', true) as ThreadChannel;
		if (!thread) return interaction.reply('Invalid thread!');

		if (!thread.manageable) return interaction.reply('I do not have permission to lock this thread!');

		if (this.isLocked(thread)) return interaction.reply(`<#${thread.id}> is already locked!`);

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for lock')
			.setPlaceholder(`This will be sent in #${thread.name} (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@lock/thread');

		interaction.user.data = {
			content: `Locked thread <#${thread.id}>!`,
			thread
		};

		return interaction.showModal(modal);
	}

	private lockAllText(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		const content = `Successfully locked all text channels for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for lock')
			.setPlaceholder(`This will be sent in all text channels (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@lock/all/text');

		interaction.user.data = {
			content,
			role
		};

		return interaction.showModal(modal);
	}

	private isLocked(channel: GuildChannel | ThreadChannel, role?: Role) {
		if (channel.isThread() && !channel.locked) return false;
		if (channel.isText() && channel.permissionsFor(role!)?.has('SEND_MESSAGES')) return false;
		if (channel.isVoice() && channel.permissionsFor(role!)?.has('CONNECT')) return false;
		return true;
	}

	private checkRole(role: Role) {
		if (role.tags?.botId) return false;
		if (role.position > role.guild.me!.roles.highest.position) return false;
		return true;
	}
}

type subcmd = 'text' | 'voice' | 'category' | 'thread';
type group = 'text';

declare module 'discord.js' {
	interface User {
		data: unknown;
	}
}
