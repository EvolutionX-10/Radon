import { RadonCommand, RadonPaginatedMessageEmbedFields, Timestamp } from '#lib/structures';
import { PermissionLevels, RadonEvents, WarnActionData } from '#lib/types';
import { color, mins, runAllChecks, uid, warnSeverity, sec } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { cutText } from '@sapphire/utilities';
import { APIApplicationCommandOptionChoice, ApplicationCommandType } from 'discord-api-types/v9';
import type { GuildMember, TextChannel } from 'discord.js';
import { Duration } from '@sapphire/time-utilities';

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

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();
		switch (subcmd) {
			case 'add':
				return this.add(interaction);
			case 'remove':
				return this.remove(interaction);
			case 'list':
				return this.list(interaction);
		}
	}

	public override async contextMenuRun(interaction: RadonCommand.ContextMenuCommandInteraction) {
		return this.list(interaction);
	}

	// Thanks @favna
	public override async autocompleteRun(interaction: RadonCommand.AutoComplete) {
		const focus = interaction.options.getFocused(true);

		if (focus.name !== 'warn_id') {
			return this.noAutocompleteResults(interaction);
		}

		const id = interaction.options.get('user')?.value as string;
		// if id is not there return no result
		if (!id) {
			return this.noAutocompleteResults(interaction);
		}
		const member = (await interaction.guild?.members.fetch(id).catch(() => null)) as GuildMember;
		if (!member) {
			return this.noAutocompleteResults(interaction);
		}
		const data = await interaction.guild?.settings?.warns.get({
			member
		});
		const warns = data?.person?.warns?.map((w) => w?.id);

		if (!warns?.length) {
			return this.noAutocompleteResults(interaction);
		}

		const choices: APIApplicationCommandOptionChoice[] = [];

		for (const warn of warns) {
			const warnsForUser = data?.person?.warns.filter((e) => e?.id === warn);

			if (!warnsForUser) continue;

			const modId = warnsForUser?.[0].mod ?? this.container.client.user?.id;

			if (!modId) continue;

			const user = await this.container.client.users.fetch(modId);

			const name = cutText(`${warnsForUser[0].id} | Mod: ${user.tag} | Reason: ${warnsForUser?.[0].reason ?? 'N/A'}`, 100);

			choices.push({
				name,
				value: warnsForUser[0].id
			});
		}

		await interaction.respond(choices.filter((choice) => choice.name.toLowerCase().includes((focus.value as string).toLowerCase())).slice(0, 24));
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addSubcommand((builder) =>
						builder //
							.setName('add')
							.setDescription('Warn a user')
							.addUserOption((option) =>
								option //
									.setName('user')
									.setDescription('The user to warn')
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
									.setDescription("Should I delete user's messages? [Default: false]")
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
									.setDescription('Should I NOT inform the user? If true, no DM will be sent! [Default: false]')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('remove')
							.setDescription('Remove a warn from a user')
							.addUserOption((option) =>
								option //
									.setName('user')
									.setDescription('The user to remove the warn from')
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
							.setDescription('List warns for a user')
							.addUserOption((option) =>
								option //
									.setName('user')
									.setDescription('The user to list warns for')
									.setRequired(true)
							)
					),
			{
				guildIds: vars.guildIds,
				idHints: ['960410676797509702', '957277610788921374']
			}
		);
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Warn List')
					.setType(ApplicationCommandType.User),
			{
				guildIds: vars.guildIds,
				idHints: ['960410679070851122', '958685725358977024']
			}
		);
	}

	private async add(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('user') as GuildMember;
		const reason = interaction.options.getString('reason', true);
		if (!member) {
			return interaction.reply({
				content: 'Please provide a valid member',
				ephemeral: true
			});
		}
		const { content: ctn, result } = runAllChecks(interaction.member as GuildMember, member, 'warn');
		if (!result || member.user.bot)
			return interaction.reply({
				content: ctn || `${vars.emojis.cross} I can't warn bots!`,
				ephemeral: true
			});
		const deleteMsg = interaction.options.getBoolean('delete_messages') ?? false;
		const severity = (interaction.options.getInteger('severity') ?? 1) as warnSeverityNum;
		const expires = interaction.options.getString('expiration') ?? this.autoSeverity(severity);
		const silent = interaction.options.getBoolean('silent') ?? false;
		if (isNaN(new Duration(expires).offset)) {
			return interaction.reply({
				content: 'Invalid duration! Valid examples: `1 week`, `1h`, `10 days`, `5 hours`',
				ephemeral: true
			});
		}
		const expiration = new Date(Date.now() + new Duration(expires).offset);
		if (expiration.getTime() > Date.now() + new Duration('28 days').offset) {
			return interaction.reply({
				content: 'Expiration cannot be more than 28 days',
				ephemeral: true
			});
		}
		if (expiration.getTime() < Date.now() + new Duration('1 hour').offset) {
			return interaction.reply({
				content: 'Expiration cannot be less than 1 hour. Please use a longer duration.',
				ephemeral: true
			});
		}
		const warnId = uid();
		const warn = await interaction.guild?.settings?.warns.add({
			expiration,
			reason,
			severity,
			warnId,
			member,
			mod: interaction.member as GuildMember
		});
		if (typeof warn === 'undefined') {
			return interaction.reply({
				content: `It seems you've already reached the limit of active warns on ${member}`,
				ephemeral: true
			});
		}

		const prevWarns_size = warn?.warnlist?.filter((warn) => warn?.id === member?.id)?.[0]?.warns.length ?? 0;

		const totalwarns = prevWarns_size + 1;
		let content = `${member} (${member.user.tag}) has been warned for __${reason}__\nWarn ID: \`${warnId}\`\n*They now have ${totalwarns} warning(s)*`;
		if (!silent) {
			await member
				.send({
					content: `You have been warned in ${member.guild.name} for __${reason}__\nWarn ID: \`${warnId}\``
				})
				.catch(() => {
					content += `\n||${vars.emojis.cross} Couldn't DM ${member}||`;
				});
		}
		await interaction.reply({
			content,
			ephemeral: true
		});
		await (interaction.channel as TextChannel).send({
			embeds: [
				{
					description: `${member} (${member.user.tag}) has been warned`,
					timestamp: new Date(),
					color: color.Moderation
				}
			]
		});

		const data: WarnActionData = {
			warnId,
			target: member,
			moderator: interaction.member as GuildMember,
			duration: new Timestamp(expiration.getTime()),
			reason,
			severity,
			action: 'warn'
		};

		if (await interaction.guild!.settings!.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}

		if (deleteMsg) {
			if (!interaction.guild?.me?.permissions.has('MANAGE_MESSAGES')) {
				return interaction.followUp({
					content: "I don't have the `MANAGE_MESSAGES` permission, so I couldn't delete messages.",
					ephemeral: true
				});
			}
			interaction.guild?.channels.cache
				.filter((c) => c.type === 'GUILD_TEXT')
				?.forEach(async (c) => {
					if (c.permissionsFor(interaction.guild!.me!).has('MANAGE_MESSAGES')) {
						const messages = await (c as TextChannel).messages.fetch({ limit: 15 }).catch(() => null);
						if (!messages) return;
						const msg = messages.filter((m) => m.author.id === member.id);
						if (msg && msg.size > 0) {
							msg.forEach(async (m) => {
								if (m.deletable && m.createdTimestamp > Date.now() - mins(15)) {
									await m.delete().catch(() => null);
								}
							});
						}
					}
				});
		}
	}

	private async remove(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('user') as GuildMember;
		const warnId = interaction.options.getString('warn_id', true);
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		if (!member) {
			return interaction.reply({
				content: 'Please provide a valid member',
				ephemeral: true
			});
		}
		const warn = await interaction.guild?.settings?.warns.remove({
			warnId,
			member
		});
		if (!warn) {
			return interaction.reply({
				content:
					`That warning does not exist on ${member.user.tag}\n` +
					`Possible reasons: \n` +
					`- The warning ID is incorrect\n` +
					`- The user has not been warned`,
				ephemeral: true
			});
		}
		const prevWarns_size = warn?.warnlist?.filter((warn) => warn?.id === member?.id)?.[0]?.warns.length ?? 0;

		const totalwarns = prevWarns_size - 1;
		const content = `${member} (${member.user.tag}) has had their warning removed\n*They now have ${totalwarns} warning(s)*`;
		await interaction.reply({
			content,
			ephemeral: false
		});

		const data: WarnActionData<'remove'> = {
			warnId,
			target: member,
			moderator: interaction.member as GuildMember,
			reason,
			action: 'warn-remove'
		};

		if (await interaction.guild!.settings!.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}
	}

	private async list(interaction: RadonCommand.ChatInputCommandInteraction | RadonCommand.ContextMenuCommandInteraction) {
		if (!interaction.channel?.isText() || interaction.channel?.type === 'DM') return;
		const member = interaction.options.getMember('user') as GuildMember;
		if (!member) {
			return interaction.reply({
				content: 'Please provide a valid member',
				ephemeral: true
			});
		}
		const data = await interaction.guild?.settings?.warns.get({
			member
		});
		if (!data?.doc || !data.person.warns.length) {
			return interaction.reply({
				content: `${member} has no warnings`,
				ephemeral: true
			});
		}
		const warns = data!.doc;
		const warns_size = warns.warnlist.filter((e) => e?.id === member?.id)[0].warns.length;
		const embed_color = color.Moderation;
		const embed_title = `${member.user.tag}'s Warnings`;
		const embed_description = `${member} has ${warns_size} warning(s)`;
		const embed_fields = await Promise.all(
			warns.warnlist
				.filter((e) => e?.id === member?.id)[0]
				.warns.map(async (e) => {
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
		const embed_footer = `Active warnings of ${member.user.tag}`;
		const embed_timestamp = new Date();
		const embed_thumbnail = {
			url: member.user.displayAvatarURL({
				dynamic: true
			})
		};
		const template = this.container.utils
			.embed()
			._color(embed_color)
			._title(embed_title)
			._description(embed_description)
			._footer({ text: embed_footer })
			._timestamp(embed_timestamp)
			._thumbnail(embed_thumbnail.url);
		const paginatedMessage = new RadonPaginatedMessageEmbedFields().setTemplate(template).setItems(embed_fields).setItemsPerPage(2).make();
		await interaction.deferReply({
			ephemeral: interaction.channel.visible()
		});
		await paginatedMessage.run(interaction, interaction.user).catch(() => null);
	}

	private autoSeverity(num: number) {
		switch (num as warnSeverityNum) {
			case 1:
				return warnSeverity.One;
			case 2:
				return warnSeverity.Two;
			case 3:
				return warnSeverity.Three;
			case 4:
				return warnSeverity.Four;
			case 5:
				return warnSeverity.Five;
		}
	}

	private noAutocompleteResults(interaction: RadonCommand.AutoComplete) {
		return interaction.respond([
			{
				name: 'No warnings found!',
				value: ''
			}
		]);
	}
}

type warnSeverityNum = 1 | 2 | 3 | 4 | 5;
