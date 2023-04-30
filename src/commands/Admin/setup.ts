import { Color } from '#constants';
import { Button, Embed, RadonCommand, Row } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { mins, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import {
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	ComponentType,
	Message,
	type OverwriteResolvable,
	OverwriteType,
	TextChannel
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

		const collector = msg.createMessageComponentCollector({
			time: mins(3),
			componentType: ComponentType.Button
		});

		// --------------------------------------
		const modRoles: string[] = [];
		const adminRoles: string[] = [];
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

				case 'retry_mod':
					collector.resetTimer();
					modRoles.length = 0;
					msg = await this.step1(i, msg, stage);
					break;

				case 'confirm_modRoles':
					if (modRoles.length === 0) {
						await i.followUp({
							content: `You must select at least one moderator role\nIf your server does not have one, please create one!`,
							ephemeral: true
						});
						collector.resetTimer();
						await this.step2(i, msg, stage);
						return;
					}
					collector.resetTimer();
					stage = 2;
					msg = await this.step2(i, msg, stage);
					break;

				case 'retry_admin':
					collector.resetTimer();
					adminRoles.length = 0;
					msg = await this.step2(i, msg, stage);
					break;

				case 'confirm_adminRoles':
					collector.resetTimer();
					stage = 3;
					msg = await this.step3(i, msg, stage);
					break;

				case 'retry_modlog':
					collector.resetTimer();
					modLogChannel = undefined;
					msg = await this.step3(i, msg, stage);
					break;

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
								`**Note:** I need a role higher than @everyone with the mentioned permissions!` +
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
						modRoles,
						adminRoles,
						modLogChannel: modLogChannel?.id ?? ''
					},
					update: {
						configured: true,
						modRoles,
						adminRoles,
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
							value: modRoles.map((m) => `<@&${m}>`).join(', '),
							inline: true
						},
						{
							name: 'Admin Roles',
							value: adminRoles.length ? adminRoles.map((m) => `<@&${m}>`).join(', ') : 'None',
							inline: true
						},
						{
							name: 'Moderation Logs Channel',
							value: modLogChannel ? `<#${modLogChannel.id}>` : 'None'
						}
					])
					._timestamp()
					._author({
						name: interaction.user.tag,
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

		const msg_collector = msg.channel.createMessageCollector({
			filter: (m) => m.author.id === interaction.user.id,
			time: mins(3)
		});

		msg_collector.on('collect', async (m) => {
			if (stage === 1) {
				const role = m.mentions.roles.first();
				await m.delete().catch(() => null);
				if (!role) return;
				if (modRoles.length < 3) {
					if (modRoles.includes(role.id)) return;
					modRoles.push(role.id);
					msg.embeds[0].fields[1].value === 'None'
						? (msg.embeds[0].fields[1].value = `${role}`)
						: (msg.embeds[0].fields[1].value += `, ${role}`);

					await msg.edit({
						embeds: msg.embeds,
						components: msg.components
					});
				}
				return msg_collector.resetTimer();
			}

			if (stage === 2) {
				const role = m.mentions.roles.first();
				await m.delete().catch(() => null);
				if (!role) return;
				if (adminRoles.length < 2) {
					if (modRoles.includes(role.id)) return;
					if (adminRoles.includes(role.id)) return;
					adminRoles.push(role.id);
					msg.embeds[0].fields[1].value === 'None'
						? (msg.embeds[0].fields[1].value = `${role}`)
						: (msg.embeds[0].fields[1].value += `, ${role}`);
					await msg.edit({
						embeds: msg.embeds,
						components: msg.components
					});
				}
				return msg_collector.resetTimer();
			}

			if (stage === 3) {
				const channel = m.mentions.channels.first();
				if (!channel || !channel.isTextBased() || channel.type !== ChannelType.GuildText) return;
				await m.delete().catch(() => null);
				msg.embeds[0].fields[1].value = `<#${channel.id}>`;

				modLogChannel = channel;

				await msg.edit({
					embeds: msg.embeds,
					components: msg.components
				});
				return msg_collector.resetTimer();
			}
			msg_collector.stop('done');
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

				for (const mod of modRoles) {
					permissionOverwrites.push(permissions(mod, true));
				}

				for (const admin of adminRoles) {
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
					.setDMPermission(false)
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
	 * enter mod roles
	 */
	private async step1(i: ButtonInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields([
			{
				name: `What are the moderator roles? [Min: 1, Max: 3]`,
				value:
					`Please __mention__ the roles below in chat.\n` +
					`Note that only the roles below will be considered as moderators\n` +
					`If you want multiple roles, you can enter them below but **only one role per message**!\n` +
					`When done, press the button to confirm, else press retry`
			},
			{
				name: 'Roles Entered',
				value: 'None'
			}
		]);
		return i.update({
			embeds: [embed],
			components: [
				new Row<Button>()._components([
					new Button()._customId('retry_mod')._label('Retry')._style(ButtonStyle.Secondary),
					new Button()._customId('confirm_modRoles')._label('Confirm')._style(ButtonStyle.Success)
				])
			],
			fetchReply: true
		}) as Promise<Message>;
	}

	/**
	 * enter admin roles
	 */
	private async step2(i: ButtonInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields([
			{
				name: `What are the administration roles? [Max: 2]`,
				value:
					`Please __mention__ the roles below in chat.\n` +
					`Note that only the roles below will be considered as admins\n` +
					`If you want multiple roles, you can enter them below but **only one role per message**!\n` +
					`When done, press the button to confirm, else press retry\n` +
					`**Note**: Moderation roles and Administration roles cannot be the same`
			},
			{
				name: 'Roles Entered',
				value: 'None'
			}
		]);
		return i.update({
			embeds: [embed],
			components: [
				new Row<Button>()._components([
					new Button()._customId('retry_admin')._label('Retry')._style(ButtonStyle.Secondary),
					new Button()._customId('confirm_adminRoles')._label('Confirm')._style(ButtonStyle.Success)
				])
			],
			fetchReply: true
		}) as Promise<Message>;
	}

	/**
	 * enter modlog channel
	 */
	private async step3(i: ButtonInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields([
			{
				name: `Where should moderation logs be sent?`,
				value:
					`Please __mention__ the channel below in chat.\n` +
					`If you **don't have** any channel, you can tell me to create one!\n` +
					`If you **don't want** to have a mod log channel press confirm!\n` +
					`When done, press the button to confirm, else press retry`
			},
			{
				name: 'Channel Entered',
				value: 'None'
			}
		]);
		return i.update({
			embeds: [embed],
			components: [
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
	 * is modlog private or public?
	 */
	private async step4(i: ButtonInteraction, prevMessage: Message, _stage: number) {
		const embed = new Embed(prevMessage.embeds[0].data)._fields([
			{
				name: `What should be the visibility of the modlog?`,
				value:
					`If the modlog is private, only the moderators will be able to see it.\n` +
					`If the modlog is public, everyone will be able to see it.\n` +
					`Please press the appropriate button\n` +
					`Note: I need \`Manage Channels\` and \`Manage Roles\` permissions to configure permissions` +
					` of the modlog channel on @everyone role!\n` +
					`It is compulsory that I should have a role higher than @everyone!\n` +
					`Once created successfully, feel free to tune permissions of the modlog channel`
			}
		]);
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
