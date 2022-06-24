import { RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { BufferResolvable, ColorResolvable, Constants, GuildMember, Role } from 'discord.js';
import { all } from 'colornames';

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
			case 'info':
				return this.info(interaction);
			case 'create':
				return this.create(interaction);
		}
	}

	public override autocompleteRun(interaction: RadonCommand.AutoComplete) {
		const focus = interaction.options.getFocused(true);
		if (focus.name !== 'color') return;

		let choices = all().map((color) => ({
			name: color.name.toUpperCase(),
			value: color.value
		}));
		choices = choices.filter((choice) => choice.name.toLowerCase().includes(focus.value as string)).slice(0, 10);

		return interaction.respond(choices);
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
					},
					{
						name: 'info',
						description: 'Shows information about role',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'role',
								description: 'Role to display information about',
								type: Constants.ApplicationCommandOptionTypes.ROLE,
								required: true
							}
						]
					},
					{
						name: 'create',
						description: 'Create a role',
						type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{
								name: 'name',
								description: 'Name of the role',
								type: Constants.ApplicationCommandOptionTypes.STRING,
								required: true
							},
							{
								name: 'color',
								description: 'Hex color of the role',
								type: Constants.ApplicationCommandOptionTypes.STRING,
								autocomplete: true,
								required: false
							},
							{
								name: 'hoisted',
								description: 'Should the role be hoisted? [default: false]',
								type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
								required: false
							},
							{
								name: 'mentionable',
								description: 'Should the role be mentionable by @everyone? [default: false]',
								type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
								required: false
							},
							{
								name: 'icon',
								description: 'Icon for the role, only for servers having role icons feature!',
								type: Constants.ApplicationCommandOptionTypes.ATTACHMENT,
								required: false
							},
							{
								name: 'reason',
								description: 'Reason for the creation of role',
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
			content: `Added ${role} to ${target} successfully!`,
			allowedMentions: { parse: [] }
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
			content: `Removed ${role} to ${target} successfully!`,
			allowedMentions: { parse: [] }
		});
	}

	private info(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true) as Role;
		const date = new Timestamp(role.createdTimestamp);

		const basic =
			`- Created At ${date.getShortDateTime()} [${date.getRelativeTime()}]\n` +
			`- Hex: *\`${role.hexColor}\`*\n` +
			`- Hoisted: ${role.hoist ? 'Yes' : 'No'}\n` +
			`- Restricted to Bot: ${role.tags?.botId ? `Yes [<@${role.tags?.botId}>]` : 'No'}\n` +
			`- Position: ${role.position}\n` +
			`- Mentionable: ${role.mentionable ? 'Yes' : 'No'}\n` +
			`- Managed externally: ${role.managed ? 'Yes' : 'No'}`;

		let perms = role.permissions
			.toArray()
			.map((e) =>
				e
					.split(`_`)
					.map((i) => i[0] + i.match(/\B(\w+)/)?.[1]?.toLowerCase())
					.join(` `)
			)
			.filter((f) => f.match(/mem|mana|min|men/gim))
			?.sort();
		if (perms.includes('Administrator')) perms = ['Administrator'];

		const adv = `- Key Permissions: ${perms.length ? perms.join(' | ') : 'None!'}\n- ID: *\`${role.id}\`*\n- Members: ${role.members.size}`;

		const embed = this.container.utils
			.embed()
			._author({
				name: 'Role Information'
			})
			._color(role.color)
			._description(role.toString())
			._timestamp()
			._thumbnail(role.iconURL() ?? '')
			._footer({
				text: `Requested by ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			._fields(
				{
					name: 'Basic Info',
					value: basic
				},
				{
					name: 'Advanced Info',
					value: adv
				}
			);

		return interaction.reply({ embeds: [embed] });
	}

	private async create(interaction: RadonCommand.ChatInputCommandInteraction) {
		const name = interaction.options.getString('name', true);
		const hoist = interaction.options.getBoolean('hoisted') ?? false;
		const mentionable = interaction.options.getBoolean('mentionable') ?? false;
		let color: string | ColorResolvable | undefined = interaction.options.getString('color') ?? undefined;
		const icon = (interaction.options.getAttachment('icon')?.attachment as BufferResolvable) ?? undefined;
		const reason = interaction.options.getString('reason') ?? undefined;
		let content = `${name} role is created successfully!`;

		const regex = /^#(?:[0-9a-fA-F]{3}){1,2}$/gim;
		if (color && !color.match(regex)) {
			color = 'RANDOM';
			content += `\n> Warning: Looks like you entered invalid color, a random color was taken!`;
		}

		const role = await interaction
			.guild!.roles.create({
				name,
				color: color as ColorResolvable | undefined,
				hoist,
				mentionable,
				icon,
				reason
			})
			.catch(() => (content = 'Role creation failed due to missing permissions'));

		content = content.replace(name, role.toString());

		return interaction.reply(content);
	}
}

type SubCommands = 'add' | 'remove' | 'info' | 'create';
