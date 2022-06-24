import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { Constants, GuildMember, Role } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Manage Roles',
	permissionLevel: PermissionLevels.Moderator,
	runIn: ['GUILD_ANY'],
	requiredClientPermissions: ['MANAGE_ROLES']
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();

		switch (subcmd as SubCommands) {
			case 'add':
				return this.add(interaction);
			case 'remove':
				return this.remove(interaction);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			{
				name: this.name,
				description: this.description,
				options: [
					{
						name: 'add',
						description: 'Add role to user',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'role',
								description: 'Role to add',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: true
							},
							{
								name: 'target',
								description: 'Target you want to add role to',
								type: Constants.ApplicationCommandOptionTypes.USER,
								required: true
							},
							{
								name: 'reason',
								description: 'Reason for action',
								type: Constants.ApplicationCommandOptionTypes.STRING,
								required: false
							}
						]
					},
					{
						name: 'remove',
						description: 'Remove role from user',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'role',
								description: 'Role to remove',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: true
							},
							{
								name: 'target',
								description: 'Target you want to remove role from',
								type: Constants.ApplicationCommandOptionTypes.USER,
								required: true
							},
							{
								name: 'reason',
								description: 'Reason for action',
								type: Constants.ApplicationCommandOptionTypes.STRING,
								required: false
							}
						]
					}
				]
			},
			{
				guildIds: vars.guildIds,
				idHints: ['', '989778331396374580']
			}
		);
	}

	private async add(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role') as Role;
		const target = interaction.options.getMember('target') as GuildMember;
		const reason = interaction.options.getString('reason') ?? undefined;

		if (!role) return;

		if (role.id === interaction.guildId) return interaction.reply(`You can't add @everyone role`);
		if (role.tags) return interaction.reply(`I cannot add roles which are linked to bots/server`);

		if (!target)
			return interaction.reply({
				content: 'Invalid Target!',
				ephemeral: true
			});

		if (role.position > interaction.guild!.me!.roles.highest!.position)
			return interaction.reply({
				content: `I can't add ${role} because its position is higher than my highest role!`
			});

		if (target.roles.cache.has(role.id)) return interaction.reply(`${target} already has ${role}`);

		await target.roles.add(role, reason).catch((e) => console.log(e.message));

		return interaction.reply({
			content: `Added ${role} to ${target} successfully!`
		});
	}

	private async remove(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role') as Role;
		const target = interaction.options.getMember('target') as GuildMember;
		const reason = interaction.options.getString('reason') ?? undefined;

		if (!role) return;

		if (role.id === interaction.guildId) return interaction.reply(`You can't remove @everyone role`);
		if (role.tags) return interaction.reply(`I cannot remove roles which are linked to bots/server`);

		if (!target)
			return interaction.reply({
				content: 'Invalid Target!',
				ephemeral: true
			});

		if (role.position > interaction.guild!.me!.roles.highest!.position)
			return interaction.reply({
				content: `I can't remove ${role} because its position is higher than my highest role!`
			});

		if (!target.roles.cache.has(role.id)) return interaction.reply(`${target} doesn't have ${role}`);

		await target.roles.remove(role, reason).catch((e) => console.log(e.message));

		return interaction.reply({
			content: `Removed ${role} to ${target} successfully!`
		});
	}
}

type SubCommands = 'add' | 'remove';
