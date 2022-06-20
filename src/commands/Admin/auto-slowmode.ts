import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Automate the Slowmode!',
	// community: true,
	requiredClientPermissions: ['MANAGE_CHANNELS'],
	permissionLevel: PermissionLevels.Administrator,
	runIn: ['GUILD_ANY']
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const { channelId, guildId } = interaction;
		const status = interaction.options.getBoolean('enable', true);
		const sensitivity = (interaction.options.getString('sensitivity') ?? 'medium') as SlowmodeSensitivity;
		let content: string;
		const data: [string] = [`${channelId}|${sensitivity}`];

		// if (!vars.owners.includes(interaction.user.id)) {
		// 	return interaction.reply({
		// 		content: `This feature is in beta stage and is not available for this server.\nHowever this will be coming to community servers soon!`,
		// 		ephemeral: true
		// 	});
		// }

		if (status) {
			const members = await this.container.db.smembers(guildId!);
			const member = members.find((m) => m.startsWith(channelId));
			if (member) {
				if (member.split('|')[1] === sensitivity) {
					content = `<#${channelId}> is already in the auto slowmode list!`;
				} else {
					await this.container.db.srem(guildId!, member);
					await this.container.db.sadd(guildId!, `${channelId}|${sensitivity}`);
					content = `<#${channelId}> is now set to ${sensitivity}`;
				}
			} else {
				await this.container.db.sadd(guildId!, data);
				content = `Added <#${channelId}> to the auto slowmode list.`;
			}
		} else {
			const members = await this.container.db.smembers(guildId!);
			const member = members.find((m) => m.startsWith(channelId));
			if (member) {
				await this.container.db.srem(guildId!, member);
				content = `Removed <#${channelId}> from the auto slowmode list.`;
			} else {
				content = `<#${channelId}> is not in the auto slowmode list!`;
			}
		}
		return interaction.reply(content);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'enable',
						description: 'Enable the automation of slowmode',
						required: true,
						type: Constants.ApplicationCommandOptionTypes.BOOLEAN
					},
					{
						name: 'sensitivity',
						description: 'The sensitivity of the slowmode',
						type: Constants.ApplicationCommandOptionTypes.STRING,
						required: false,
						choices: [
							{ name: 'High', value: 'high' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'Low', value: 'low' }
						]
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['985059429428916244', '983949086539530281']
			}
		);
	}
}

type SlowmodeSensitivity = 'high' | 'medium' | 'low';
