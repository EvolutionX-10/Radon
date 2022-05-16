import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope } from '@sapphire/framework';
import { Constants, GuildChannel, Role, TextChannel } from 'discord.js';

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
					}
				]
			},
			{
				guildIds: vars.radonGuildId,
				idHints: ['975669603403444224', '975667690498834482']
			}
		);
	}

	private async lockText(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel', true) as TextChannel;
		if (!channel) return interaction.reply('Invalid channel!');
		if (!channel.permissionsFor(this.container.client.user!)!.has('MANAGE_CHANNELS'))
			return interaction.reply('I do not have permission to lock channels!');

		const role = (interaction.options.getRole('role') ?? interaction.guild!.roles.everyone!) as Role;

		if (this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already locked for ${role}!`);

		const update = await channel.permissionOverwrites
			.edit(role, {
				SEND_MESSAGES: false,
				ADD_REACTIONS: false,
				CREATE_PUBLIC_THREADS: false,
				CREATE_PRIVATE_THREADS: false
			})
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

		if (this.isLocked(channel, role)) return interaction.reply(`<#${channel.id}> is already locked for ${role}!`);

		const update = await channel.permissionOverwrites
			.edit(role, {
				CONNECT: false,
				SPEAK: false
			})
			.catch(() => null);
		if (!update) return interaction.reply('Failed to lock channel!');

		return interaction.reply(`Locked <#${channel.id}> for ${role}!`);
	}

	private isLocked(channel: GuildChannel, role: Role) {
		if (channel.isText() && channel.permissionsFor(role).has('SEND_MESSAGES')) return false;
		if (channel.isVoice() && channel.permissionsFor(role).has('CONNECT')) return false;
		return true;
	}
}

type subcmd = 'text' | 'voice';
