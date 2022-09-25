import { PermissionLevel } from '#lib/decorators';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import { ChannelType, PermissionFlagsBits } from 'discord-api-types/v9';
import { CategoryChannel, GuildChannel, MessageActionRow, Modal, ModalActionRowComponent, Role, TextInputComponent, ThreadChannel } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Unlock!',
	permissionLevel: PermissionLevels.Moderator,
	cooldownDelay: sec(30),
	cooldownScope: BucketScope.Guild,
	requiredClientPermissions: ['MANAGE_ROLES'],
	cooldownLimit: 3
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subCmd = interaction.options.getSubcommand();
		const grp = interaction.options.getSubcommandGroup(false);
		if (grp) {
			switch (subCmd as group) {
				case 'text':
					return this.unlockAllText(interaction);
				case 'voice':
					return this.unlockAllVoice(interaction);
				case 'thread':
					return this.unlockAllThread(interaction);
			}
		}
		switch (subCmd as subcmd) {
			case 'text':
				return this.unlockText(interaction);
			case 'voice':
				return this.unlockVoice(interaction);
			case 'category':
				return this.unlockCategory(interaction);
			case 'thread':
				return this.unlockThread(interaction);
			case 'server':
				return this.unlockServer(interaction);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false)
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
		const channel = interaction.options.getChannel('channel', true);

		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_ROLES'))
			return interaction.reply('I do not have permission to unlock channels!');

		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;

		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		if (!this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is not locked for ${role}!`);

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for unlock')
			.setPlaceholder(`This will be sent in #${channel.name} (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Unlock').setComponents(row).setCustomId('@unlock/text');

		interaction.user.data = {
			content: `Unlocked channel <#${channel.id}> for ${role}`,
			channel,
			role
		};

		return interaction.showModal(modal);
	}

	private async unlockVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true);

		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_ROLES'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		if (!this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already unlocked for ${role}!`);
		if (channel.isThread()) return;
		const update = await channel.permissionOverwrites
			.edit(
				role,
				{
					CONNECT: null,
					SPEAK: null
				},
				{
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				}
			)
			.catch(() => null);
		if (!update) return interaction.reply(`Failed to unlock channel for ${role}!`);

		return interaction.reply(`Unlocked <#${channel.id}> for ${role}!`);
	}

	private unlockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		const category = interaction.options.getChannel('channel', true) as CategoryChannel;

		if (!category.permissionsFor(this.container.client.user!)!.has('MANAGE_ROLES'))
			return interaction.reply('I do not have permission to unlock channels!');

		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;

		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		const threads = interaction.options.getBoolean('threads') ?? false;

		const content = `Successfully unlocked __${category.name}__ for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for unlock')
			.setPlaceholder(`This will be sent in ${category.name} (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Unlock').setComponents(row).setCustomId('@unlock/category');

		interaction.user.data = {
			content,
			category,
			role,
			threads
		};

		return interaction.showModal(modal);
	}

	private unlockThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		const thread = interaction.options.getChannel('channel', true);
		if (!thread || !thread.isThread()) return interaction.reply('Invalid thread!');

		if (!thread.manageable) return interaction.reply('I do not have permission to unlock this thread!');

		if (!this.isLocked(thread)) return interaction.reply(`<#${thread.id}> is already unlocked!`);

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for unlock')
			.setPlaceholder(`This will be sent in #${thread.name} (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Unlock').setComponents(row).setCustomId('@unlock/thread');

		interaction.user.data = {
			content: `Unlocked <#${thread.id}>!`,
			thread
		};

		return interaction.showModal(modal);
	}

	@PermissionLevel('Administrator')
	private unlockAllText(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		const content = `Successfully unlocked all text channels for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for unlock')
			.setPlaceholder(`This will be sent in all text channels (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Unlock').setComponents(row).setCustomId('@unlock/all/text');

		interaction.user.data = {
			content,
			role
		};

		return interaction.showModal(modal);
	}

	@PermissionLevel('Administrator')
	private async unlockAllVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;

		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		await interaction.deferReply();
		let content = `Successfully locked all voice channels for ${role}!\n\nIssues Found:`;
		const channels = interaction.guild.channels.cache.filter((c) => c.type === 'GUILD_VOICE');

		for (const channel of channels.values()) {
			if (!this.isLocked(channel, role) || channel.type !== 'GUILD_VOICE') continue;
			await this.container.utils.wait(500);

			channel.permissionOverwrites
				.edit(
					role,
					{
						CONNECT: null,
						SPEAK: null
					},
					{
						reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
					}
				)
				.catch(() => (content += `\n> Missing permissions to unlock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	@PermissionLevel('Administrator')
	private unlockAllThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		const content = `Successfully unlocked all thread channels for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for unlock')
			.setPlaceholder(`This will be sent in all threads (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Unlock').setComponents(row).setCustomId('@unlock/all/thread');

		interaction.user.data = {
			content,
			role
		};

		return interaction.showModal(modal);
	}

	@PermissionLevel('Administrator')
	private unlockServer(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;
		const deep = interaction.options.getBoolean('deep') ?? false;

		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}

		const content = `Successfully unlocked server for ${role}!\n\nIssues Found:`;

		const modal = new Modal();
		const ReasonInput = new TextInputComponent()
			.setCustomId('reason')
			.setLabel('Reason for unlock')
			.setPlaceholder(`This will be sent in all channels (OPTIONAL)`)
			.setRequired(false)
			.setStyle('PARAGRAPH');

		const row = new MessageActionRow<ModalActionRowComponent>().setComponents(ReasonInput);

		modal.setTitle('Lock').setComponents(row).setCustomId('@unlock/server');

		interaction.user.data = {
			content,
			role,
			deep
		};

		return interaction.showModal(modal);
	}

	private isLocked(channel: GuildChannel | ThreadChannel, role?: Role) {
		if (channel.isThread() && !channel.locked) return false;
		if (!channel.isVoice() && channel.permissionsFor(role!).has('SEND_MESSAGES')) return false;
		return !(channel.isVoice() && channel.permissionsFor(role!).has('CONNECT'));
	}

	private checkRole(role: Role) {
		if (role.tags?.botId) return false;
		return role.position <= role.guild.me!.roles.highest.position;
	}
}

type subcmd = 'text' | 'voice' | 'category' | 'thread' | 'server';
type group = Exclude<subcmd, 'category' | 'server'>;
