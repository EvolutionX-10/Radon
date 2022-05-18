import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import { CategoryChannel, Constants, GuildChannel, Role, TextChannel, ThreadChannel } from 'discord.js';

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
								name: 'category',
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
					}
				]
			},
			{
				guildIds: vars.radonGuildId.concat(['953175228899553312']),
				idHints: ['975669603403444224', '975667690498834482', '976055923191734312']
			}
		);
	}

	private async lockText(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as TextChannel;
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
					SEND_MESSAGES: false,
					ADD_REACTIONS: false,
					CREATE_PUBLIC_THREADS: false,
					CREATE_PRIVATE_THREADS: false
				},
				{
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				}
			)
			.catch(() => null);
		if (!update) return interaction.reply(`Failed to lock channel for ${role}!`);

		return interaction.reply(`Locked <#${channel.id}> for ${role}!`);
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

	private async lockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		const category = interaction.options.getChannel('category', true) as CategoryChannel;
		if (!category) return interaction.reply('Invalid category!');
		if (!category.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot or higher than my highest role! Action cancelled.');
		}
		const threads = interaction.options.getBoolean('threads') ?? false;

		await interaction.deferReply();

		let content = `Successfully locked __${category.name}__ for ${role}!\n\nIssues Found:`;

		for await (const channel of category.children.values()) {
			if (this.isLocked(channel, role)) continue;
			await wait(1_000);

			await channel.permissionOverwrites
				.edit(
					role,
					{
						SEND_MESSAGES: false,
						ADD_REACTIONS: false,
						CONNECT: false,
						SPEAK: false,
						CREATE_PUBLIC_THREADS: threads ? false : undefined,
						CREATE_PRIVATE_THREADS: threads ? false : undefined,
						USE_PUBLIC_THREADS: threads ? false : undefined,
						USE_PRIVATE_THREADS: threads ? false : undefined,
						SEND_MESSAGES_IN_THREADS: threads ? false : undefined
					},
					{
						reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
					}
				)
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply({ content });
	}

	private async lockThread(interaction: RadonCommand.ChatInputCommandInteraction) {
		const thread = interaction.options.getChannel('channel', true) as ThreadChannel;
		if (!thread) return interaction.reply('Invalid thread!');

		if (!thread.manageable) return interaction.reply('I do not have permission to lock this thread!');

		if (this.isLocked(thread)) return interaction.reply(`<#${thread.id}> is already locked!`);

		const lock = await thread.setLocked(true, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(() => null);

		const archive = await thread.setArchived(true, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(() => null);

		if ((!lock && !archive) || !archive) return interaction.reply('Failed to lock thread!');

		return interaction.reply(`Locked <#${thread.id}>!`);
	}

	private isLocked(channel: GuildChannel | ThreadChannel, role?: Role) {
		if (channel.isThread() && channel.locked) return true;
		if (channel.isText() && channel.permissionsFor(role!).has('SEND_MESSAGES')) return false;
		if (channel.isVoice() && channel.permissionsFor(role!).has('CONNECT')) return false;
		return true;
	}

	private checkRole(role: Role) {
		if (role.tags?.botId) return false;
		if (role.position > role.guild.me!.roles.highest.position) return false;
		return true;
	}
}

type subcmd = 'text' | 'voice' | 'category' | 'thread';

async function wait(ms: number) {
	const wait = (await import('node:util')).promisify(setTimeout);
	return wait(ms);
}
