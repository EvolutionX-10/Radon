import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v9';

@ApplyOptions<RadonCommand.Options>({
	description: 'Automate the Slowmode!',
	// community: true,
	requiredClientPermissions: ['MANAGE_CHANNELS'],
	permissionLevel: PermissionLevels.Administrator
})
export class UserCommand extends RadonCommand {
	readonly #SensitivityChoices: APIApplicationCommandOptionChoice<SlowmodeSensitivity>[] = [
		{ name: 'High', value: 'high' },
		{ name: 'Medium', value: 'medium' },
		{ name: 'Low', value: 'low' }
	];

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
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addBooleanOption((option) =>
						option //
							.setName('enable')
							.setDescription('Enable the automation of slowmode')
							.setRequired(true)
					)
					.addStringOption((option) =>
						option //
							.setName('sensitivity')
							.setDescription('The sensitivity of the slowmode')
							.setRequired(false)
							.setChoices(...this.#SensitivityChoices)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['985059429428916244', '983949086539530281']
			}
		);
	}
}

type SlowmodeSensitivity = 'high' | 'medium' | 'low';
