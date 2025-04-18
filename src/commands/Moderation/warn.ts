import { Color, Emojis, WarnSeverity } from '#constants';
import { PermissionLevel } from '#lib/decorators';
import { Embed, JustButtons, RadonCommand, RadonPaginatedMessageEmbedFields, Timestamp } from '#lib/structures';
import type { warnAction } from '#lib/types';
import { type BaseWarnActionData, PermissionLevels, RadonEvents, type WarnActionData } from '#lib/types';
import { mins, runAllChecks, sec, uid } from '#lib/utility';
import type { MemberWarnData } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Duration, DurationFormatter } from '@sapphire/duration';
import { cutText } from '@sapphire/utilities';
import { type APIApplicationCommandOptionChoice, ApplicationCommandType } from 'discord-api-types/v9';
import type { Collection, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Manage warnings for a user',
	permissionLevel: PermissionLevels.Moderator,
	cooldownDelay: sec(5),
	cooldownLimit: 3
})
export class UserCommand extends RadonCommand {
	readonly #SeverityChoices: APIApplicationCommandOptionChoice<warnSeverityNum>[] = [
		{ name: '1 | 1 day', value: 1 },
		{ name: '2 | 3 days', value: 2 },
		{ name: '3 | 1 week', value: 3 },
		{ name: '4 | 2 weeks', value: 4 },
		{ name: '5 | 4 weeks', value: 5 }
	];

	readonly #WarnActions: APIApplicationCommandOptionChoice<warnAction>[] = [
		{ name: 'Kick', value: 'kick' },
		{ name: 'Ban', value: 'ban' },
		{ name: 'Softban', value: 'softban' },
		{ name: 'Timeout', value: 'timeout' }
	];

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();
		const subcmdgroup = interaction.options.getSubcommandGroup(false);
		if (subcmdgroup) {
			switch (subcmd as actionCommand) {
				case 'create':
					return this.createAction(interaction);
				case 'remove':
					return this.removeAction(interaction);
				case 'list':
					return this.listActions(interaction);
			}
		}
		switch (subcmd as subCommand) {
			case 'add':
				return this.add(interaction);
			case 'remove':
				return this.remove(interaction);
			case 'list':
				return this.list(interaction);
			case 'list_all':
				return this.list_all(interaction);
		}
	}

	public override contextMenuRun(interaction: RadonCommand.UserContextMenuCommandInteraction) {
		return this.list(interaction);
	}

	// Thanks @favna
	public override async autocompleteRun(interaction: RadonCommand.AutoComplete) {
		const focus = interaction.options.getFocused(true);

		if (focus.name === 'severity') {
			const actions = await interaction.guild?.settings?.warns?.getActions();

			if (!actions?.length) return this.noAutocompleteResults(interaction, 'action');

			const choices: APIApplicationCommandOptionChoice[] = actions.map((action) => {
				return {
					name: `Action: ${action.action} | Severity: ${action.severity}`,
					value: action.severity
				};
			});

			const filtered = choices.filter((choice) => choice.name.toLowerCase().includes((focus.value as string).toLowerCase())).slice(0, 24);
			return interaction.respond(filtered);
		}

		const id = interaction.options.get('target')?.value as string;
		// if id is not there return no result
		if (!id) return this.noAutocompleteResults(interaction);

		const member = (await interaction.guild?.members.fetch(id).catch(() => null)) as GuildMember;
		if (!member) return this.noAutocompleteResults(interaction);

		const data = await interaction.guild?.settings?.warns.get(member);
		if (!data) return this.noAutocompleteResults(interaction);
		const warns = data.person.warns?.map((w) => w.id);

		if (!warns?.length) return this.noAutocompleteResults(interaction);

		const choices: APIApplicationCommandOptionChoice[] = [];

		for (const warn of warns) {
			const warnsForUser = data?.person?.warns.find((e) => e.id === warn);

			if (!warnsForUser) continue;

			const modId = warnsForUser.mod ?? this.container.client.user?.id;

			if (!modId) continue;

			const user = await this.container.client.users.fetch(modId);

			const name = cutText(`${warnsForUser.id} | Mod: ${user.tag} | Reason: ${warnsForUser.reason ?? 'N/A'}`, 100);

			choices.push({
				name,
				value: warnsForUser.id
			});
		}

		const filtered = choices.filter((choice) => choice.name.toLowerCase().includes((focus.value as string).toLowerCase())).slice(0, 24);
		return interaction.respond(filtered);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.addSubcommand((builder) =>
						builder //
							.setName('add')
							.setDescription('Warn a member')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('The member to warn')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('The reason for the warn')
									.setRequired(true)
							)
							.addBooleanOption((option) =>
								option //
									.setName('delete_messages')
									.setDescription("Should I delete member's messages? [Default: false]")
									.setRequired(false)
							)
							.addIntegerOption((option) =>
								option //
									.setName('severity')
									.setDescription('The severity of the warn [Default: 1]')
									.setRequired(false)
									.addChoices(...this.#SeverityChoices)
							)
							.addStringOption((option) =>
								option //
									.setName('expiration')
									.setDescription('The expiration of the warn [Default: 1 day]')
									.setRequired(false)
							)
							.addBooleanOption((option) =>
								option //
									.setName('silent')
									.setDescription('Should I NOT inform the member? If true, no DM will be sent! [Default: false]')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('remove')
							.setDescription('Remove a warn from a member')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('The member to remove the warn from')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('warn_id')
									.setDescription('The ID of the warn to remove')
									.setRequired(true)
									.setAutocomplete(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('The reason for the removal')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('list')
							.setDescription('List warns for a member')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('The member to list warns for')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('list_all')
							.setDescription('List all warns of all members')
					)
					.addSubcommandGroup((builder) =>
						builder //
							.setName('action')
							.setDescription('Perform automated actions based on warns')
							.addSubcommand((builder) =>
								builder //
									.setName('create')
									.setDescription('Create a new automated action')
									.addStringOption((option) =>
										option //
											.setName('action')
											.setDescription('The action to perform')
											.setRequired(true)
											.setChoices(...this.#WarnActions)
									)
									.addIntegerOption((option) =>
										option //
											.setName('severity')
											.setDescription('The severity at which the action should be triggered [1 - 250]')
											.setMinValue(1)
											.setMaxValue(250)
											.setRequired(true)
									)
									.addStringOption((option) =>
										option //
											.setName('duration')
											.setDescription('The duration of the action (only for Timeout)')
											.setRequired(false)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('remove')
									.setDescription('Remove an automated action')
									.addIntegerOption((option) =>
										option //
											.setName('severity')
											.setDescription('The severity trigger of the action')
											.setMinValue(1)
											.setMaxValue(250)
											.setAutocomplete(true)
											.setRequired(true)
									)
							)
							.addSubcommand((builder) =>
								builder //
									.setName('list')
									.setDescription('List all automated actions')
							)
					),
			{ idHints: ['960410676797509702', '1019932004877348924'] }
		);
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Warn List')
					.setType(ApplicationCommandType.User)
					.setContexts([InteractionContextType.Guild]),
			{ idHints: ['960410679070851122', '1019932007117094982'] }
		);
	}

	private async add(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		const reason = interaction.options.getString('reason', true);
		if (!interaction.channel) return;
		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				flags: MessageFlags.Ephemeral
			});
		}
		const { content: ctn, result } = runAllChecks(interaction.member, member, 'warn');
		if (!result || member.user.bot)
			return interaction.reply({
				content: ctn || `${Emojis.Cross} Bots were not meant to be warned!`,
				flags: MessageFlags.Ephemeral
			});
		const deleteMsg = interaction.options.getBoolean('delete_messages') ?? false;
		const severity = (interaction.options.getInteger('severity') ?? 1) as warnSeverityNum;
		const expires = interaction.options.getString('expiration') ?? expirationFromSeverity[severity];
		const silent = interaction.options.getBoolean('silent') ?? false;

		if (isNaN(new Duration(expires).offset)) {
			return interaction.reply({
				content: `${Emojis.Cross} Invalid duration! Valid examples: \`1 week\`, \`1h\`, \`10 days\`, \`5 hours\``,
				flags: MessageFlags.Ephemeral
			});
		}
		const expiration = new Date(Date.now() + new Duration(expires).offset);
		if (expiration.getTime() > Date.now() + new Duration('28 days').offset) {
			return interaction.reply({
				content: `${Emojis.Cross} Expiration cannot be more than 28 days`,
				flags: MessageFlags.Ephemeral
			});
		}
		if (expiration.getTime() < Date.now() + new Duration('1 hour').offset) {
			return interaction.reply({
				content: `${Emojis.Cross} Expiration cannot be less than 1 hour. Please use a longer duration.`,
				flags: MessageFlags.Ephemeral
			});
		}
		const warnId = uid();

		const warn = await interaction.guild.settings?.warns.add({
			expiration,
			reason,
			severity,
			warnId,
			member,
			mod: interaction.member
		});

		if (typeof warn === 'undefined') {
			return interaction.reply({
				content: `It seems you've already reached the limit of active warns on ${member}`,
				flags: MessageFlags.Ephemeral
			});
		}
		const person = warn.warnlist.find((warn) => warn.id === member.id);

		const totalSeverity = person?.warns.reduce((acc, warn) => acc + warn.severity, 0) ?? severity;
		const totalwarns = person!.warns.length;
		const actions = await interaction.guild.settings?.warns.getActions();

		let content = `${member} has been warned for __${reason}__\nWarn ID: \`${warnId}\`\n*They now have ${totalwarns} warning(s)*`;
		if (!silent) {
			await member
				.send({
					content: `You have been warned in ${member.guild.name} for __${reason}__\nWarn ID: \`${warnId}\``
				})
				.catch(() => {
					content += `\n\n> ${Emojis.Cross} Couldn't DM member`;
				});
		}
		await interaction.reply({ content, flags: MessageFlags.Ephemeral });

		const data: WarnActionData = {
			warnId,
			target: member,
			moderator: interaction.member,
			duration: new Timestamp(expiration.getTime()),
			reason,
			severity,
			action: 'warn'
		};

		if (await interaction.guild.settings!.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		if (actions?.length) {
			this.container.client.emit(RadonEvents.WarnAction, member, totalSeverity, actions);
		}

		if (deleteMsg) {
			if (!interaction.guild.members.me?.permissions.has('ManageMessages')) {
				return interaction.followUp({
					content: "I don't have the `Manage Messages` permission, so I couldn't delete messages.",
					flags: MessageFlags.Ephemeral
				});
			}
			const textChannels = interaction.guild.channels.cache.filter(
				(c) => c.isTextBased() && c.permissionsFor(interaction.guild.members.me!).has('ManageMessages')
			) as Collection<string, GuildTextBasedChannel>;

			for (const channel of textChannels.values()) {
				const messages = await channel.messages.fetch({ limit: 15 }).catch(() => null);
				if (!messages) continue;
				for (const message of messages.filter((m) => m.author.id === member.id).values()) {
					if (!message) continue;
					if (message.deletable && (message.editedTimestamp ?? message.createdTimestamp) > Date.now() - mins(15)) {
						await message.delete().catch(() => null);
					}
				}
			}
		}

		return interaction.channel.send({
			embeds: [
				{
					description: `${member} has been warned`,
					color: Color.Moderation
				}
			]
		});
	}

	private async remove(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		const warnId = interaction.options.getString('warn_id', true);
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				flags: MessageFlags.Ephemeral
			});
		}

		const warn = await interaction.guild.settings?.warns.remove(warnId, member);

		if (!warn) {
			return interaction.reply({
				content:
					`That warning does not exist on ${member}\n` +
					`Possible reasons: \n` +
					`\` - \` The warning ID is incorrect\n` +
					`\` - \` The member has not been warned`
			});
		}

		const totalwarns = warn.warnlist.find((warn) => warn?.id === member.id)?.warns.length ?? 0;

		const content = `${member} had their warning removed\n*They now have ${totalwarns} warning(s)*`;

		const data: BaseWarnActionData = {
			warnId,
			target: member,
			moderator: interaction.member,
			reason,
			action: 'warn_remove'
		};

		if (await interaction.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		return interaction.reply({ content, ephemeral: false });
	}

	private async list(interaction: RadonCommand.ChatInputCommandInteraction | RadonCommand.UserContextMenuCommandInteraction) {
		const member = interaction.options.getMember('target') ?? interaction.options.getMember('user');
		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				flags: MessageFlags.Ephemeral
			});
		}
		const data = await interaction.guild.settings?.warns.get(member);

		if (!data?.doc || !data.person.warns.length) {
			return interaction.reply({
				content: `${member} has no warnings`,
				flags: MessageFlags.Ephemeral
			});
		}
		const warns_size = data!.person.warns.length;
		const embed_fields = await Promise.all(
			data.person.warns.map(async (e) => {
				const mod = await this.container.client.users.fetch(e.mod);
				const expiration = new Timestamp(e.expiration.getTime());
				const time = new Timestamp(e.date.getTime());
				return {
					name: `Warn ID: ${e.id}`,
					value:
						`> Reason: ${e.reason}\n> Given on ${time.getShortDateTime()} (${time.getRelativeTime()})` +
						`\n> Severity: \`${e.severity}\`` +
						`\n> Expires ${expiration.getRelativeTime()} (${expiration.getShortDateTime()})` +
						`\n> Moderator: ${mod} (\`${mod.id}\`)`,
					inline: false
				};
			})
		);

		const template = new Embed()
			._color(Color.Moderation)
			._title(`${member.user.tag}'s Warnings`)
			._description(`${member} has ${warns_size} warning(s)`)
			._footer({ text: `Active warnings of ${member.displayName}` })
			._timestamp()
			._thumbnail(member.displayAvatarURL({ forceStatic: false }));

		const paginatedMessage = new RadonPaginatedMessageEmbedFields() //
			.setTemplate(template)
			.setItems(embed_fields)
			.setItemsPerPage(2)
			.make();

		return paginatedMessage.run(interaction).catch(() => null);
	}

	private async list_all(interaction: RadonCommand.ChatInputCommandInteraction) {
		const warnData = await this.container.prisma.guildWarns.findUnique({ where: { id: interaction.guildId } });

		if (!warnData || !warnData.warnlist || !warnData.warnlist.length) return interaction.reply(`No warnings found!`);

		const paginatedEmbed = new JustButtons();

		for (const warn of warnData.warnlist) {
			const target = await this.container.client.users.fetch(warn.id);
			const embed = new Embed()
				._color('Random')
				._title(`Server Infractions`)
				._author({ name: target.tag })
				._description(this.genDescription(warn))
				._footer({ text: `Requested by ${interaction.user.username}` })
				._timestamp()
				._thumbnail(target.displayAvatarURL({ forceStatic: false }));
			paginatedEmbed.addPageEmbed(embed);
		}

		return paginatedEmbed.run(interaction);
	}

	private genDescription(warns: MemberWarnData) {
		return warns.warns
			.map((warn) => {
				const givenDate = new Timestamp(warn.date.getTime()).getShortDate();
				return `\` - \` Date: ${givenDate} \`|\` Reason: ${warn.reason}`;
			})
			.join('\n');
	}

	@PermissionLevel('Administrator')
	private async createAction(interaction: RadonCommand.ChatInputCommandInteraction) {
		const action = interaction.options.getString('action', true) as warnAction;
		const severity = interaction.options.getInteger('severity', true);
		let time = interaction.options.getString('duration');
		await interaction.deferReply();

		let content = `\nIt will be applied to any user that crosses the threshold of \`${severity}\` severity in warnings.`;

		if (action === 'timeout' && !time) return interaction.editReply(`Please provide a duration for timeout!`);

		let duration: number | undefined;

		if (action === 'timeout') {
			if (!isNaN(Number(time))) time += 's';

			duration = new Duration(time!).offset;

			if (isNaN(duration))
				return interaction.editReply({
					content: `${Emojis.Cross} Invalid duration! Valid examples: \`1d\`, \`1h\`, \`1m\`, \`1s\`\nTo remove a timeout just put \`0\` as the duration.`
				});

			const MAX_TIMEOUT_DURATION = new Duration('28d').offset;

			if (duration > MAX_TIMEOUT_DURATION) {
				return interaction.editReply({
					content: `${Emojis.Cross} You cannot timeout a member for more than 28 days!`
				});
			}
		}

		const added = await interaction.guild.settings!.warns.addAction({
			action,
			severity,
			expiration: duration
		});

		if (added === null)
			return interaction.editReply({
				content: `${Emojis.Cross} An action already exists for severity ${severity}`
			});
		if (added === undefined)
			return interaction.editReply({
				content: `You have 10 actions already! There is a limit of 10 actions\nRemove actions in order to create new!`
			});

		if (time && action !== 'timeout') content += `\n\n> Note: The duration will be ignored here since the action is not a timeout.`;

		const timeoutcontent = time && action === 'timeout' ? ` with a duration of __${new DurationFormatter().format(duration!)}__.` : '.';

		return interaction.editReply({
			content: `${Emojis.Confirm} Successfully added a ${action} action${timeoutcontent}\n${content}`
		});
	}

	@PermissionLevel('Administrator')
	private async removeAction(interaction: RadonCommand.ChatInputCommandInteraction) {
		const severity = interaction.options.getInteger('severity', true);
		const rem = await interaction.guild.settings?.warns?.removeAction(severity);
		if (!rem)
			return interaction.reply({
				content: 'No action found for this severity',
				flags: MessageFlags.Ephemeral
			});
		return interaction.reply({
			content: `${Emojis.Confirm} Successfully removed the ${rem.action} action for ${rem.severity} severity`
		});
	}

	private async listActions(interaction: RadonCommand.ChatInputCommandInteraction) {
		const actions = await interaction.guild.settings?.warns?.getActions();

		if (!actions?.length)
			return interaction.reply({
				content: 'No actions found',
				flags: MessageFlags.Ephemeral
			});

		const embed_fields = actions.map((e) => {
			return {
				name: `Severity: ${e.severity}`,
				value: `> Action: ${action[e.action as warnAction]} ${e.expiration ? `[${new DurationFormatter().format(e.expiration)}]` : ''}`,
				inline: false
			};
		});

		const template = new Embed()
			._color(Color.Moderation)
			._title('Warn Actions')
			._description('Actions that will be applied to users when they cross the threshold of a certain severity in warnings')
			._footer({ text: interaction.guild.name })
			._timestamp()
			._thumbnail(interaction.guild.iconURL());

		const paginatedMessage = new RadonPaginatedMessageEmbedFields() //
			.setTemplate(template)
			.setItems(embed_fields)
			.setItemsPerPage(2)
			.make();

		return paginatedMessage.run(interaction).catch(() => null);
	}

	private noAutocompleteResults(interaction: RadonCommand.AutoComplete, result = 'warning') {
		return interaction.respond([
			{
				name: `No ${result}s found!`,
				value: result === 'warning' ? '' : 0
			}
		]);
	}
}

const expirationFromSeverity = {
	1: WarnSeverity.One,
	2: WarnSeverity.Two,
	3: WarnSeverity.Three,
	4: WarnSeverity.Four,
	5: WarnSeverity.Five
};

const action = {
	timeout: 'Timeout',
	ban: 'Ban',
	kick: 'Kick',
	softban: 'Softban'
};

type warnSeverityNum = 1 | 2 | 3 | 4 | 5;
type subCommand = 'add' | 'remove' | 'list' | 'list_all';
type actionCommand = 'create' | 'remove' | 'list';
