import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import { CategoryChannel, Constants, GuildChannel, Role, TextChannel } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Unlock!',
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
				return this.unlockText(interaction);
			case 'voice':
				return this.unlockVoice(interaction);
			case 'category':
				return this.unlockCategory(interaction);
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
						description: 'Unlock a text channel',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'channel',
								description: 'The channel to unlock',
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								required: true,
								channelTypes: ['GUILD_TEXT']
							},
							{
								name: 'role',
								description: 'The role to unlock the channel for (defaults to @everyone)',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: false
							}
						]
					},
					{
						name: 'voice',
						description: 'Unlock a voice channel',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'channel',
								description: 'The channel to unlock',
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								required: true,
								channelTypes: ['GUILD_VOICE']
							},
							{
								name: 'role',
								description: 'The role to unlock the channel for (defaults to @everyone)',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: false
							}
						]
					},
					{
						name: 'category',
						description: 'Unlock all channels under category',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'category',
								description: "The category who's channels to unlock",
								type: Constants.ApplicationCommandOptionTypes.CHANNEL,
								channelTypes: ['GUILD_CATEGORY'],
								required: true
							},
							{
								name: 'role',
								description: 'The role to unlock the channel for (defaults to @everyone)',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: false
							},
							{
								name: 'threads',
								description: 'Whether to unlock all threads in the category (defaults to false)',
								type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
								required: false
							}
						]
					}
				]
			},
			{
				guildIds: vars.radonGuildId.concat(['953175228899553312']),
				idHints: ['975669604993089537', '975667692465950770', '976057751451095050']
			}
		);
	}

	private async unlockText(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as TextChannel;
		if (!channel) return interaction.reply('Invalid channel!');
		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to unlock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot! Action cancelled.');
		}

		if (!this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is not locked for ${role}!`);

		const update = await channel.permissionOverwrites
			.edit(
				role,
				{
					SEND_MESSAGES: null,
					ADD_REACTIONS: null,
					CREATE_PUBLIC_THREADS: null,
					CREATE_PRIVATE_THREADS: null
				},
				{
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				}
			)
			.catch(() => null);
		if (!update) return interaction.reply(`Failed to unlock channel for ${role}!`);

		return interaction.reply(`Unlocked <#${channel.id}> for ${role}!`);
	}

	private async unlockVoice(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as GuildChannel;
		if (!channel) return interaction.reply('Invalid channel!');
		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;
		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot! Action cancelled.');
		}

		if (!this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already unlocked for ${role}!`);

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

	private async unlockCategory(interaction: RadonCommand.ChatInputCommandInteraction) {
		const category = interaction.options.getChannel('category', true) as CategoryChannel;
		if (!category) return interaction.reply('Invalid category!');
		if (!category.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to unlock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;

		if (!this.checkRole(role)) {
			return interaction.reply('This role is integrated to a bot! Action cancelled.');
		}
		const threads = interaction.options.getBoolean('threads') ?? false;

		await interaction.deferReply();

		let content = `Successfully unlocked __${category.name}__ for ${role}!\n\nIssues Found:`;

		for await (const channel of category.children.values()) {
			if (!this.isLocked(channel, role)) continue;
			await wait(1_000);

			await channel.permissionOverwrites
				.edit(
					role,
					{
						SEND_MESSAGES: null,
						ADD_REACTIONS: null,
						CONNECT: null,
						SPEAK: null,
						CREATE_PUBLIC_THREADS: threads ? null : undefined,
						CREATE_PRIVATE_THREADS: threads ? null : undefined,
						USE_PUBLIC_THREADS: threads ? null : undefined,
						USE_PRIVATE_THREADS: threads ? null : undefined,
						SEND_MESSAGES_IN_THREADS: threads ? null : undefined
					},
					{
						reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
					}
				)
				.catch(() => (content += `\n> Missing Permissions to unlock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;
		return interaction.editReply({ content });
	}

	private isLocked(channel: GuildChannel, role: Role) {
		if (channel.isText() && channel.permissionsFor(role).has('SEND_MESSAGES')) return false;
		if (channel.isVoice() && channel.permissionsFor(role).has('CONNECT')) return false;
		return true;
	}

	private checkRole(role: Role) {
		if (role.tags?.botId) return false;
		return true;
	}
}

type subcmd = 'text' | 'voice' | 'category';

async function wait(ms: number) {
	const wait = (await import('node:util')).promisify(setTimeout);
	return wait(ms);
}
