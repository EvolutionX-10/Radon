import { Color } from '#constants';
import { Button, Embed, RadonCommand, Row } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { mins, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import {
	MessageComponentInteraction,
	ButtonStyle,
	ChannelType,
	Message,
	type OverwriteResolvable,
	OverwriteType,
	TextChannel,
	RoleSelectMenuBuilder,
	Role,
	Collection,
	type APIRole,
	ChannelSelectMenuBuilder,
	InteractionContextType
} from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(60),
	cooldownLimit: 2,
	description: `Easy and interactive setup for Radon`,
	permissionLevel: PermissionLevels.Administrator
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		let stage = 0;
		let msg = (await interaction.reply({
			embeds: [this.welcome()],
			fetchReply: true,
			components: [
				new Row<Button>()._components([
					new Button() //
						._customId('not-ready')
						._label('I am not ready for this maze')
						._style(ButtonStyle.Secondary)
						._emoji('<:pepeOhno:891375539019976744>'),
					new Button() //
						._customId('start')
						._label("Let's get started!")
						._style(ButtonStyle.Secondary)
						._emoji('<a:poggershype:879074649781174272>')
				])
			]
		})) as Message;

		const collector = msg.createMessageComponentCollector({ time: mins(3) });

		// --------------------------------------
		let modRoles: Collection<string, Role | APIRole>;
		let adminRoles: Collection<string, Role | APIRole>;
		let modLogChannel: TextChannel | undefined;
		// --------------------------------------

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				await i.followUp({
					content: `This maze isn't for you mate!`,
					ephemeral: true
				});
				return;
			}

			switch (i.customId) {
				case 'not-ready':
					await i.update({
						content: `No issues! You can do it whenever you are ready!`,
						embeds: [],
						components: []
					});
					collector.stop('not-ready');
					return;

				case 'start':
					collector.resetTimer();
					stage = 1;
					await this.step1(i, msg, stage);
					break;

				case 'mod_roles':
					stage = 2;
					collector.resetTimer();
					if (!i.isRoleSelectMenu()) break;
					modRoles = i.roles;
					msg = await this.step2(i, msg, stage);
					break;

				case 'admin_roles':
					stage = 3;
					collector.resetTimer();
					if (!i.isRoleSelectMenu()) break;
					adminRoles = i.roles;
					if (adminRoles.some((r) => modRoles.has(r.id))) {
						await i.reply({
							content: `Moderation roles and Administration roles cannot be the same!`,
							ephemeral: true
						});
						break;
					}
					msg = await this.step3(i, msg, stage);
					break;

				case 'retry_modlog':
					collector.resetTimer();
					modLogChannel = undefined;
					msg = await this.step3(i, msg, stage);
					break;

				// @ts-expect-error Falling through is intentional to avoid code duplication
				case 'modlog_channel':
					if (!i.isChannelSelectMenu()) break;
					modLogChannel = i.channels.first() as TextChannel;
				case 'confirm_modlog':
					stage = 4;
					// eslint-disable-next-line no-case-declarations
					const edit = await modLogChannel!
						.edit({
							permissionOverwrites: permissions(
								!modLogChannel!.permissionsFor(interaction.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel)
							)
						})
						.catch(async () => {
							await i.channel!.send(
								`I am unable to edit permissions of ${modLogChannel}. Please grant me admin permission or click on "Make a new modlog"`
							);
							return null;
						});
					if (edit) {
						collector.stop('Complete');
					} else {
						stage = 3;
						collector.resetTimer();
						modLogChannel = undefined;
						msg = await this.step3(i, msg, stage);
					}
					break;

				case 'make_modlog':
					if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
						await i.followUp({
							content: `I don't have the permissions to create channels!\nPlease give me the \`Manage Channels\` permission!`,
							ephemeral: true
						});
						return;
					}
					collector.resetTimer();
					modLogChannel = undefined;
					stage = 4;
					msg = await this.step4(i, msg, stage);
					break;

				case 'public_modlog':
				case 'private_modlog':
					modLogChannel = await makeModlog(i.customId === 'private_modlog').catch(async (_) => {
						collector.stop();
						await i.followUp({
							content:
								`I couldn't create the modlog channel due to insufficient permissions!\nPlease try again after granting ` +
								`\`Manage Channels\` [Creation of Channel], \`Manage Roles\` [To configure channel permissions], \`Embed Links and Send Messages\` [To send modlogs] permissions to me!\n` +
								`**Note:** I need a role other than @everyone with the mentioned permissions!` +
								`If you are still having issues run </about me:970217477126643752> and join our support server!`,
							ephemeral: true
						});
						return undefined;
					});
					collector.stop('Complete');
					stage = 5;
					break;
			}
		});

		collector.on('end', async (_c, r) => {
			if (r === 'not-ready') return;

			if (r === 'Complete') {
				const data = await this.container.prisma.guildSettings.upsert({
					create: {
						id: interaction.guildId,
						configured: true,
						modRoles: modRoles.map((m) => m.id),
						adminRoles: adminRoles.map((m) => m.id),
						modLogChannel: modLogChannel?.id ?? ''
					},
					update: {
						configured: true,
						modRoles: modRoles.map((m) => m.id),
						adminRoles: adminRoles.map((m) => m.id),
						modLogChannel: modLogChannel?.id ?? ''
					},
					where: {
						id: interaction.guildId
					}
				});
				const final = new Embed()
					._color(Color.Admin)
					._title('Overview')
					._description('Here is a quick overview of your setup!')
					._fields([
						{
							name: 'Moderator Roles',
							value: modRoles.map((r) => r).join(', '),
							inline: true
						},
						{
							name: 'Admin Roles',
							value: adminRoles.map((r) => r).join(', ') || 'None',
							inline: true
						},
						{
							name: 'Moderation Logs Channel',
							// eslint-disable-next-line @typescript-eslint/no-base-to-string
							value: modLogChannel ? `${modLogChannel}` : 'None'
						}
					])
					._timestamp()
					._author({
						name: interaction.user.globalName ?? interaction.user.username,
						iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
					})
					._footer({
						text: `${data ? 'Saved Successfully' : 'Created Successfully'}`
					});

				await msg.edit({
					content: `Setup completed!`,
					embeds: [final],
					components: []
				});
				return;
			}

			await msg.edit({
				content: `Setup failed due to inactivity!`,
				embeds: [],
				components: []
			});
		});

		async function makeModlog(is_private: boolean) {
			const moglog = await interaction.guild?.channels.create({
				name: 'modlog',
				type: ChannelType.GuildText,
				topic: `Moderation log for ${interaction.guild?.name}`,
				permissionOverwrites: permissions(is_private)
			});
			return moglog;
		}

		function permissions(is_private: boolean) {
			let permissionOverwrites: OverwriteResolvable[] = [];
			if (is_private) {
				permissionOverwrites = [
					{
						id: interaction.guild.id,
						deny: ['ViewChannel'],
						type: OverwriteType.Role
					},
					{
						id: interaction.client.user.id,
						allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageChannels', 'ManageRoles'],
						type: OverwriteType.Member
					}
				];
				const permissions = (id: string, mod: boolean): OverwriteResolvable => {
					return {
						id,
						allow: ['ViewChannel'],
						deny: mod ? ['SendMessages', 'ManageChannels', 'ManageRoles'] : [],
						type: OverwriteType.Role
					};
				};

				for (const mod of modRoles.keys()) {
					permissionOverwrites.push(permissions(mod, true));
				}

				for (const admin of adminRoles.keys()) {
					permissionOverwrites.push(permissions(admin, false));
				}
			} else {
				permissionOverwrites = [
					{
						id: interaction.guild.id,
						allow: ['ViewChannel'],
						deny: ['ManageChannels', 'SendMessages', 'ManageRoles'],
						type: OverwriteType.Role
					},
					{
						id: interaction.client.user.id,
						allow: ['SendMessages', 'EmbedLinks', 'ManageChannels', 'ManageRoles'],
						type: OverwriteType.Member
					}
				];
			}
			return permissionOverwrites;
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts(InteractionContextType.Guild)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
			{ idHints: ['951113445930065980', '1019931909528223765'] }
		);
	}

	private welcome() {
		return new Embed()
			._color(Color.Admin)
			._thumbnail(this.container.client.user?.displayAvatarURL() ?? '')
			._timestamp()
			._title('Welcome to Radon!')
			._description(`This is the setup wizard for Radon.\nThis will guide you through the process of setting up Radon.`);
	}

	/**
	 * Moderator Roles Selection
	 */
	private async step1(i: MessageComponentInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields([
			{
				name: `What are the Moderator roles? [Min: 1, Max: 3]`,
				value: `Only the **selected** roles below will be considered as moderators`
			}
		]);

		const rolesMenu = new RoleSelectMenuBuilder()
			.setCustomId('mod_roles')
			.setPlaceholder('Select moderator roles')
			.setMinValues(1)
			.setMaxValues(3);

		return i.update({
			embeds: [embed],
			components: [new Row<RoleSelectMenuBuilder>()._components([rolesMenu])],
			fetchReply: true
		}) as Promise<Message>;
	}

	/**
	 * Admin Roles Selection
	 */
	private async step2(i: MessageComponentInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields(
			[
				{
					name: `What are the Admin roles? [Max: 2]`,
					value:
						`Only the **selected** roles below will be considered as admins\n` +
						`**Note**: __Moderation roles and Admin roles cannot be the same__`
				}
			],
			true
		);

		const rolesMenu = new RoleSelectMenuBuilder() //
			.setCustomId('admin_roles')
			.setPlaceholder('Select admin roles')
			.setMinValues(0)
			.setMaxValues(2);

		return i.update({
			embeds: [embed],
			components: [new Row<RoleSelectMenuBuilder>()._components([rolesMenu])],
			fetchReply: true
		}) as Promise<Message>;
	}

	/**
	 * ModLog Channel Selection
	 */
	private async step3(i: MessageComponentInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields(
			[
				{
					name: `Where should moderation logs be sent?`,
					value:
						`If you **don't have** any channel, you can tell me to create one!\n` +
						`If you **don't want** to have a mod log channel press confirm!`
				}
			],
			true
		);

		const channelMenu = new ChannelSelectMenuBuilder() //
			.setCustomId('modlog_channel')
			.setPlaceholder('Select modlogs channel')
			.setMinValues(0)
			.setMaxValues(1)
			.setChannelTypes(ChannelType.GuildText);

		return i.update({
			embeds: [embed],
			components: [
				new Row<ChannelSelectMenuBuilder>()._components([channelMenu]),
				new Row<Button>()._components([
					new Button()._customId('retry_modlog')._label('Retry')._style(ButtonStyle.Secondary),
					new Button()._customId('make_modlog')._label('Make a new modlog')._style(ButtonStyle.Primary),
					new Button()._customId('confirm_modlog')._label('Confirm')._style(ButtonStyle.Success)
				])
			],
			fetchReply: true
		}) as Promise<Message>;
	}

	/**
	 * ModLog Channel Visibility
	 */
	private async step4(i: MessageComponentInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields(
			[
				{
					name: `What should be the visibility of the modlog?`,
					value:
						`If the modlog is __private__, only the moderators will be able to see it.\n` +
						`If the modlog is __public__, everyone will be able to see it.\n` +
						`Please press the appropriate button\n` +
						`> Note: I need \`Manage Channels\` and \`Manage Roles\` permissions to configure permissions ` +
						`of the modlog channel on @everyone role!\n` +
						`> It is compulsory that I should have a role other than @everyone!\n` +
						`> Once created successfully, feel free to tune permissions of the modlog channel`
				}
			],
			true
		);
		return i.update({
			embeds: [embed],
			components: [
				new Row<Button>()._components([
					new Button()._customId('private_modlog')._label('Private')._style(ButtonStyle.Primary),
					new Button()._customId('public_modlog')._label('Public')._style(ButtonStyle.Primary)
				])
			],
			fetchReply: true
		}) as Promise<Message>;
	}
}
