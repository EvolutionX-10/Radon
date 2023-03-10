import { Emojis } from '#constants';
import { PermissionLevel } from '#lib/decorators';
import { Button, Confirmation, RadonCommand, Row } from '#lib/structures';
import { GuildMessage, PermissionLevels } from '#lib/types';
import { mins, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { DurationFormatter } from '@sapphire/duration';
import { Stopwatch } from '@sapphire/stopwatch';
import { all } from 'colornames';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import {
	BufferResolvable,
	Collection,
	ColorResolvable,
	GuildMember,
	PermissionsBitField,
	PermissionResolvable,
	Role,
	ButtonStyle,
	ButtonBuilder,
	StringSelectMenuBuilder,
	SelectMenuComponentOptionData
} from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Manage Roles',
	permissionLevel: PermissionLevels.Moderator,
	requiredClientPermissions: ['ManageRoles'],
	cooldownDelay: sec(30),
	cooldownLimit: 2
})
export class UserCommand extends RadonCommand {
	public override chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();

		const subcmdgroup = interaction.options.getSubcommandGroup(false);

		if (subcmdgroup === 'bulk') return this.bulk(interaction, subcmd as bulkActions);

		switch (subcmd as Subcommands) {
			case 'add':
				return this.add(interaction);
			case 'remove':
				return this.remove(interaction);
			case 'create':
				return this.create(interaction);
			case 'delete':
				return this.delete(interaction);
		}
	}

	public override autocompleteRun(interaction: RadonCommand.AutoComplete) {
		const focus = interaction.options.getFocused(true);
		if (focus.name !== 'color') return;

		let choices = all().map((color) => ({
			name: color.name.toUpperCase(),
			value: color.value
		}));
		choices = choices.filter((choice) => choice.name.toLowerCase().startsWith((focus.value as string).toLowerCase())).slice(0, 10);

		return interaction.respond(choices);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
					.addSubcommand((builder) =>
						builder //
							.setName('add')
							.setDescription('Add a role to a member')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to add')
									.setRequired(true)
							)
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('Target you want to add role to')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('Reason for action')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('remove')
							.setDescription('Remove a role from a user')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to remove')
									.setRequired(true)
							)
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('Target you want to remove role from')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('Reason for action')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('create')
							.setDescription('Create a role')
							.addStringOption((option) =>
								option //
									.setName('name')
									.setDescription('Name of the role')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('color')
									.setDescription('Color of the role')
									.setRequired(false)
									.setAutocomplete(true)
							)
							.addBooleanOption((option) =>
								option //
									.setName('hoisted')
									.setDescription('Should the role be hoisted? [default: false]')
									.setRequired(false)
							)
							.addBooleanOption((option) =>
								option //
									.setName('mentionable')
									.setDescription('Should the role be mentionable by @everyone? [default: false]')
									.setRequired(false)
							)
							.addAttachmentOption((option) =>
								option //
									.setName('icon')
									.setDescription('Icon for the role, only for servers having role icons feature!')
									.setRequired(false)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('Reason for action')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('delete')
							.setDescription('Delete a role')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to delete')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('Reason for action')
									.setRequired(false)
							)
					)
					.addSubcommandGroup((builder) =>
						builder //
							.setName('bulk')
							.setDescription('Bulk actions for roles')
							.addSubcommand((builder) =>
								builder //
									.setName('add')
									.setDescription('Add roles to multiple members')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to add')
											.setRequired(true)
									)
									.addRoleOption((option) =>
										option //
											.setName('base_role')
											.setDescription('Base role member should have for role to be added (defaults to @everyone)')
											.setRequired(false)
									)
									.addStringOption((option) =>
										option //
											.setName('reason')
											.setDescription('Reason for action')
											.setRequired(false)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('remove')
									.setDescription('Remove roles from multiple members')
									.addRoleOption((option) =>
										option //
											.setName('role')
											.setDescription('The role to remove')
											.setRequired(true)
									)
									.addRoleOption((option) =>
										option //
											.setName('base_role')
											.setDescription('Base role member should have for role to be removed (defaults to @everyone)')
											.setRequired(false)
									)
									.addStringOption((option) =>
										option //
											.setName('reason')
											.setDescription('Reason for action')
											.setRequired(false)
									)
							)
					),
			{ idHints: ['991634355069915176', '1019932095428182167'] }
		);
	}

	private async add(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true);
		const target = interaction.options.getMember('target');
		const reason = interaction.options.getString('reason') ?? undefined;

		if (!role) return;

		if (role.id === interaction.guildId) return interaction.reply(`You can't add @everyone role`);
		if (role.tags) return interaction.reply(`I cannot add roles which are linked to bots/server`);

		if (!target)
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				ephemeral: true
			});

		if (role.position > interaction.guild.members.me!.roles.highest!.position)
			return interaction.reply({
				content: `${Emojis.Cross} I can't add ${role} because its position is higher than my highest role!`
			});

		if (target.roles.cache.has(role.id)) return interaction.reply(`${target} already has ${role}`);

		const added = await target.roles.add(role, reason).catch(() => null);

		if (!added) {
			return interaction.reply({
				content: `${Emojis.Cross} Failed to add ${role} to ${target}`,
				ephemeral: true
			});
		}

		return interaction.reply({
			content: `Added ${role} to ${target} successfully!`,
			allowedMentions: { parse: [] }
		});
	}

	private async remove(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true);
		const target = interaction.options.getMember('target');
		const reason = interaction.options.getString('reason') ?? undefined;

		if (role.id === interaction.guildId) return interaction.reply(`You can't remove @everyone role`);
		if (role.tags) return interaction.reply(`I cannot remove roles which are linked to bots/server`);

		if (!target)
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				ephemeral: true
			});

		if (role.position > interaction.guild.members.me!.roles.highest.position)
			return interaction.reply({
				content: `${Emojis.Cross} I can't remove ${role} because its position is higher than my highest role!`
			});

		if (!target.roles.cache.has(role.id)) return interaction.reply(`${target} doesn't have ${role}`);

		const removed = await target.roles.remove(role, reason).catch(() => null);

		if (!removed) {
			return interaction.reply({
				content: `${Emojis.Cross} Failed to remove ${role} from ${target}`,
				ephemeral: true
			});
		}

		return interaction.reply({
			content: `Removed ${role} to ${target} successfully!`,
			allowedMentions: { parse: [] }
		});
	}

	private async create(interaction: RadonCommand.ChatInputCommandInteraction) {
		const message = (await interaction.deferReply({ fetchReply: true })) as RadonCommand.Message;

		const name = interaction.options.getString('name', true);
		const hoist = interaction.options.getBoolean('hoisted') ?? false;
		const mentionable = interaction.options.getBoolean('mentionable') ?? false;
		let color: string | ColorResolvable | undefined = interaction.options.getString('color') ?? undefined;
		const icon = (interaction.options.getAttachment('icon')?.attachment as BufferResolvable) ?? undefined;
		const reason = interaction.options.getString('reason') ?? undefined;

		let content = `${name} role is created successfully!`;

		const regex = /^#(?:[0-9a-fA-F]{3}){1,2}$/gim;
		if (color && !color.match(regex)) {
			color = 'Random';
			content += `\n> Warning: Looks like you entered invalid color, a random color was taken!`;
		}

		const role = (await interaction.guild.roles
			.create({
				name,
				color: color as ColorResolvable | undefined,
				hoist,
				mentionable,
				icon,
				reason,
				permissions: []
			})
			.catch(() => (content = 'Role creation failed due to missing permissions'))) as Role;

		content = content.replace(name, role.toString());

		let perms = (await interaction.guild.members.me?.fetch())?.permissions.toArray() ?? [];
		if (perms.includes('Administrator')) perms = new PermissionsBitField(PermissionsBitField.All).toArray();
		perms = perms.filter((perm) => interaction.member.permissions.toArray().includes(perm));

		if (!perms.length) return interaction.editReply(content);

		const menus = this.gimmeMenu(perms);
		const rows = Array(menus.length)
			.fill(null)
			.map((_, i) => new Row<StringSelectMenuBuilder>()._components(menus[i]));

		const save = new Button()._customId('save')._label('Save Selection')._style(ButtonStyle.Success);

		const row = new Row<ButtonBuilder>()._components(save);

		await interaction.editReply({
			content,
			components: [...rows, row]
		});

		return this.collector(message, role, interaction);
	}

	private async delete(interaction: RadonCommand.ChatInputCommandInteraction) {
		const role = interaction.options.getRole('role', true);
		const reason = interaction.options.getString('reason') ?? undefined;

		if (role.managed) {
			return interaction.editReply("This role is managed by an integration, you can't delete it!");
		}
		if (role.position > interaction.guild.members.me!.roles?.highest?.position) {
			return interaction.editReply(`${Emojis.Cross} I can't delete ${role} because its position is higher than my highest role!`);
		}
		await role.delete(reason);
		return interaction.reply(`Role __*${role.name}*__ deleted!`);
	}

	@PermissionLevel('Administrator')
	private async bulk(interaction: RadonCommand.ChatInputCommandInteraction, option: bulkActions) {
		const role = interaction.options.getRole('role', true);
		const reason = interaction.options.getString('reason') ?? undefined;
		const base = interaction.options.getRole('base_role') ?? interaction.guild.roles.everyone;

		if (role.id === interaction.guildId) return interaction.reply(`You can't add @everyone role`);
		if (role.tags) return interaction.reply(`I cannot add roles which are linked to bots/server`);

		if (role.position > interaction.guild.members.me!.roles.highest!.position)
			return interaction.reply({
				content: `${Emojis.Cross} I can't add ${role} because its position is higher than my highest role!`
			});

		if (role.id === base.id) return interaction.reply(`${Emojis.Cross} You can't bulk ${option} same role as base role!`);

		if (interaction.guild.bulkRoleInProgress) return interaction.reply(`${Emojis.Cross} A bulk role process is already in progress!`);

		await interaction.guild.members.fetch();

		let { members } = base;
		members = members.filter((m) => (option === 'add' ? !m.roles.cache.has(role.id) : m.roles.cache.has(role.id)));

		if (!members.size) return interaction.reply(`${Emojis.Cross} No members found for the action to proceed! Terminating...`);

		const confirm = new Confirmation({
			content: `Are you sure you want to ${option} ${role} ${option === 'add' ? 'to' : 'from'} every member ${
				base.id === interaction.guildId ? 'in this server' : ` with ${base} role`
			}?`,
			onConfirm: async () => {
				await this.bulkAction(interaction, members, option, role, reason);
			},
			onCancel: async ({ i }) => {
				await i.editReply('Process cancelled!');
			}
		});
		return confirm.run(interaction);
	}

	private gimmeMenu(array: string[]) {
		const newarray = this.container.utils.summableArray(array.length, 25);
		const menus: StringSelectMenuBuilder[] = [];

		for (const [index, amount] of newarray.entries()) {
			const perms = array.sort().splice(0, amount);

			const options: SelectMenuComponentOptionData[] = Array(amount)
				.fill(null)
				.map((_, i) => {
					return {
						label: this.container.utils.format(perms[i]),
						value: perms[i]
					};
				});

			const menu = new StringSelectMenuBuilder()
				.setCustomId(`@role/perms/menu/${index}`)
				.setPlaceholder('Select some permissions!')
				.setMinValues(0)
				.setMaxValues(amount)
				.setOptions(...options);

			menus.push(menu);
		}
		return menus;
	}

	private collector(message: RadonCommand.Message, role: Role, interaction: RadonCommand.ChatInputCommandInteraction) {
		const collector = message.createMessageComponentCollector({ time: mins(1) });

		let perms: string[] = [];
		let perms1: string[] = [];
		let perms2: string[] = [];

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				await i.reply({
					content: "This maze ain't for you!",
					ephemeral: true
				});
				return;
			}

			if (i.isStringSelectMenu()) {
				await i.deferUpdate();
				switch (i.customId as SelectMenuCustomIds) {
					case '@role/perms/menu/0':
						perms1 = i.values;
						break;
					case '@role/perms/menu/1':
						perms2 = i.values;
						break;
				}
				perms = [...new Set(perms1.concat(perms2))];
			}
			collector.resetTimer();

			if (i.customId === 'save') {
				message = (await message.fetch()) as GuildMessage;

				await i.update({
					content: message.content.concat(`\n\n> Saved with ${perms.length ? 'selected' : 'no'} permissions!`),
					components: []
				});
				collector.stop('Saved');
			}
		});

		collector.on('end', async (c, r) => {
			if (r !== 'Saved') perms = [];
			if ((c.size === 0 || !perms.length) && r !== 'Saved') {
				const row = new Row<Button>(...message.components);
				row.components.map((c) => c.setDisabled());
				await message.edit({
					content: message.content.concat('\n\n> Role was created with no permissions!'),
					components: [row]
				});
				return;
			}

			await role.setPermissions(perms as PermissionResolvable);
		});
	}

	private async bulkAction(
		interaction: RadonCommand.ChatInputCommandInteraction,
		members: Collection<string, GuildMember>,
		option: bulkActions,
		role: Role,
		reason?: string
	) {
		const estimate = new DurationFormatter().format((members.size + 2) * 1000);
		interaction.editReply(`Starting bulk role action...\nEstimated time: **~${estimate}**`);
		interaction.guild!.bulkRoleInProgress = true;
		let i = 0;
		const stopwatch = new Stopwatch().start();
		for (const member of members.values()) {
			await this.container.utils.wait(1000);
			i++;
			if (option === 'add') {
				await member.roles.add(role, reason);
			} else {
				await member.roles.remove(role, reason);
			}
		}

		const time = stopwatch.stop().toString();
		interaction.guild.bulkRoleInProgress = false;
		return interaction.editReply({
			content: `Process completed!\n\nTime taken: **${time}**\nMembers affected: **${i}**`,
			components: []
		});
	}
}

type Subcommands = 'add' | 'remove' | 'create' | 'delete';
type SelectMenuCustomIds = '@role/perms/menu/0' | '@role/perms/menu/1';
type bulkActions = Extract<Subcommands, 'add' | 'remove'>;

declare module 'discord.js' {
	interface Guild {
		bulkRoleInProgress?: boolean;
	}
}
