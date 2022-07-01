import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import { ChannelType } from 'discord-api-types/v9';
import {
	CategoryChannel,
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
	requiredClientPermissions: ['MANAGE_ROLES'],
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
				case 'voice':
					return this.lockAllVoice(interaction);
				case 'thread':
					return this.lockAllThread(interaction);
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
			case 'server':
				return this.lockServer(interaction);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
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
									.addChannelTypes(ChannelType.GuildNewsThread)
									.addChannelTypes(ChannelType.GuildPublicThread)
									.addChannelTypes(ChannelType.GuildPrivateThread)
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
			{
				guildIds: vars.guildIds,
				idHints: ['978320030452297769', '975667690498834482']
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

	private lockVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as GuildChannel;
		if (!channel) return interaction.reply('Invalid channel!');
		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_ROLES'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		if (this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already locked for ${role}!`);
		let content = `Locked <#${channel.id}> for ${role}!`;

		channel.permissionOverwrites
			.edit(
				channel.guild.me!,
				{
					CONNECT: true,
					SPEAK: true
				},
				{
					reason: 'Creating permissions to avoid self lock out'
				}
			)
			.catch(() => (content += `\nFailed to create self permissions, please report this to my developers!`));
		channel.permissionOverwrites
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

		return interaction.reply(content);
	}

	private lockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		const category = interaction.options.getChannel('channel', true) as CategoryChannel;
		if (!category) return interaction.reply('Invalid category!');
		if (!category.permissionsFor(this.container.client.user!)!.has('MANAGE_ROLES'))
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

	private async lockAllVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		await interaction.deferReply();
		let content = `Successfully locked all voice channels for ${role}!\n\nIssues Found:`;
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_VOICE');

		for await (const channel of channels.values()) {
			if (this.isLocked(channel, role) || channel.type !== 'GUILD_VOICE') continue;
			await wait(500);
			channel.permissionOverwrites
				.edit(
					channel.guild.me!,
					{
						CONNECT: true,
						SPEAK: true
					},
					{
						reason: 'Creating permissions to avoid self lock out'
					}
				)
				.catch(() => null);

			channel.permissionOverwrites
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
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private lockAllThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		const content = `Successfully locked all threads for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for lock')
			.setPlaceholder(`This will be sent in all threads (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@lock/all/thread');

		interaction.user.data = {
			content,
			role
		};

		return interaction.showModal(modal);
	}

	private lockServer(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		const deep = interaction.options.getBoolean('deep') ?? false;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		const content = `Successfully locked server for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for lock')
			.setPlaceholder(`This will be sent in all channels (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@lock/server');

		interaction.user.data = {
			content,
			role,
			deep
		};

		return interaction.showModal(modal);
	}

	private isLocked(channel: GuildChannel | ThreadChannel, role?: Role) {
		if (channel.isThread() && !channel.locked) return false;
		if (channel.isText() && channel.permissionsFor(role!)?.has('SEND_MESSAGES')) return false;
		return !(channel.isVoice() && channel.permissionsFor(role!)?.has('CONNECT'));
	}

	private checkRole(role: Role) {
		if (role.tags?.botId) return false;
		return role.position <= role.guild.me!.roles.highest.position;
	}
}

async function wait(ms: number) {
	const wait = (await import('node:util')).promisify(setTimeout);
	return wait(ms);
}

type subcmd = 'text' | 'voice' | 'category' | 'thread' | 'server';
type group = Exclude<subcmd, 'category' | 'server'>;

declare module 'discord.js' {
	interface User {
		data: unknown;
	}
}
