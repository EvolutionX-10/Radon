/* eslint-disable @typescript-eslint/no-unused-vars */
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { color, mins, sec } from '#lib/utility';
import { guildSettingsDB } from '#models';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { ButtonInteraction, Message, OverwriteResolvable, Permissions, Role } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	cooldownDelay: sec(60),
	cooldownLimit: 2,
	description: `Easy and interactive setup for Radon`,
	permissionLevel: PermissionLevels.Administrator
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const row = this.container.utils.row();

		if (
			interaction.channel?.type === 'GUILD_TEXT' &&
			interaction.channel.permissionsFor(interaction.guild?.roles.everyone as Role).has('VIEW_CHANNEL')
		) {
			await interaction.reply({
				content: 'Woah wait! It seems this channel is viewable by everyone! Please make sure you run setup in a private channel.',
				ephemeral: true
			});
			return;
		}

		let stage = 0;
		let msg = (await interaction.reply({
			embeds: [this.welcome()],
			fetchReply: true,
			components: [
				row._components([
					this.container.utils.button()._customId('not-ready')._label('I am not ready for this maze')._style('SECONDARY'),
					this.container.utils.button()._customId('start')._label("Let's get started!")._style('PRIMARY')
				])
			]
		})) as Message;

		const collector = msg.createMessageComponentCollector({
			time: mins(3),
			componentType: 'BUTTON'
		});

		// --------------------------------------
		const modRoles: string[] = [];
		const adminRoles: string[] = [];
		let modLogChannel = '';
		// --------------------------------------

		collector.on('collect', async (i) => {
			await i.deferUpdate({ fetchReply: true });

			if (i.user.id !== interaction.user.id) {
				await i.followUp({
					content: `This isn't for you mate`,
					ephemeral: true
				});
				return;
			}

			switch (i.customId) {
				case 'not-ready':
					await msg.edit({
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
					modLogChannel = '';
					msg = await this.step3(i, msg, stage);
					break;

				case 'confirm_modlog':
					stage = 4;
					collector.stop('Complete');
					break;

				case 'make_modlog':
					if (!interaction.guild?.me?.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
						await i.followUp({
							content: `I don't have the permissions to create channels!\nPlease give me the Manage Channels permission!`,
							ephemeral: true
						});
						return;
					}
					collector.resetTimer();
					modLogChannel = '';
					stage = 4;
					msg = await this.step4(i, msg, stage);
					break;

				case 'public_modlog':
				case 'private_modlog':
					modLogChannel =
						(
							await makeModlog(i.customId === 'private_modlog').catch(async (r) => {
								collector.stop();
								console.log(r);
								await i.followUp({
									content:
										`I couldn't create the modlog channel due to insufficient permissions!\nPlease try again after granting ` +
										`\`Manage Channels\` [Creation of Channel], \`Manage Roles\` [To configure channel permissions], \`Embed Links and Send Messages\` [To send modlogs] permissions to me!\n` +
										`Note: I need a role higher than @everyone with the mentioned permissions!` +
										`If you are still having issues run \`/invite\` and join our support server!`,
									ephemeral: true
								});
							})
						)?.id ?? '';
					collector.stop('Complete');
					stage = 5;
					break;
			}
		});

		collector.on('end', async (_c, r) => {
			if (r === 'not-ready') return;

			if (r === 'Complete') {
				const data = await guildSettingsDB.findByIdAndUpdate(
					interaction.guildId,
					{
						configured: true,
						modRoles,
						adminRoles,
						modLogChannel
					},
					{
						upsert: true
					}
				);
				const final = this.container.utils
					.embed()
					._color(color.Admin)
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
							name: 'Moderation Log Channel',
							value: modLogChannel.length ? `<#${modLogChannel}>` : 'None'
						}
					])
					._timestamp()
					._author({
						name: interaction.user.username,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true })
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
				content: `Setup failed!`,
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
				if (!channel || !channel.isText() || channel.type !== 'GUILD_TEXT') return;
				await m.delete().catch(() => null);
				modLogChannel = channel.id;
				msg.embeds[0].fields[1].value = `<#${channel.id}>`;
				await msg.edit({
					embeds: msg.embeds,
					components: msg.components
				});
				return msg_collector.resetTimer();
			}
			msg_collector.stop('done');
		});

		async function makeModlog(is_private: boolean) {
			// TODO change the string and use enums according to v14
			let permissionOverwrites: OverwriteResolvable[] = [];
			if (is_private) {
				permissionOverwrites = [
					{
						id: interaction.guild!.id,
						deny: ['VIEW_CHANNEL'],
						type: 'role'
					},
					{
						id: container.client.user!.id,
						allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS'],
						type: 'member'
					}
				];
				modRoles.forEach((mod) => {
					permissionOverwrites.push({
						allow: ['VIEW_CHANNEL'],
						deny: ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
						id: mod,
						type: 'role'
					});
				});
				adminRoles.forEach((admin) => {
					permissionOverwrites.push({
						allow: ['VIEW_CHANNEL'],
						id: admin,
						type: 'role'
					});
				});
			} else {
				permissionOverwrites = [
					{
						id: interaction.guild!.id,
						allow: ['VIEW_CHANNEL'],
						deny: ['MANAGE_CHANNELS', 'SEND_MESSAGES'],
						type: 'role'
					},
					{
						id: container.client.user!.id,
						allow: ['SEND_MESSAGES', 'EMBED_LINKS'],
						type: 'member'
					}
				];
			}
			const moglog = await interaction.guild?.channels.create('modlog', {
				topic: `Moderation log for ${interaction.guild?.name}`,
				permissionOverwrites
			});
			return moglog;
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description),
			{
				guildIds: vars.guildIds,
				idHints: ['951113445930065980', '951679292348174419']
			}
		);
	}

	private welcome() {
		return this.container.utils
			.embed()
			._color(color.Admin)
			._thumbnail(this.container.client.user?.displayAvatarURL() ?? '')
			._timestamp()
			._title('Welcome to Radon!')
			._description(`This is the setup wizard for Radon.\nThis will guide you through the process of setting up Radon.`);
	}

	/**
	 * enter mod roles
	 */
	private async step1(_btnInt: ButtonInteraction, prevMessage: Message, _stage: number) {
		const row = this.container.utils.row();
		prevMessage.embeds[0].setFields([
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
		return prevMessage.edit({
			embeds: [prevMessage.embeds[0]],
			components: [
				row._components([
					this.container.utils.button()._customId('retry_mod')._label('Retry')._style('SECONDARY'),
					this.container.utils.button()._customId('confirm_modRoles')._label('Confirm')._style('SUCCESS')
				])
			]
		});
	}

	/**
	 * enter admin roles
	 */
	private async step2(_btnInt: ButtonInteraction, prevMessage: Message, _stage: number) {
		const row = this.container.utils.row();
		prevMessage.embeds[0].setFields([
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
		return prevMessage.edit({
			embeds: [prevMessage.embeds[0]],
			components: [
				row._components([
					this.container.utils.button()._customId('retry_admin')._label('Retry')._style('SECONDARY'),
					this.container.utils.button()._customId('confirm_adminRoles')._label('Confirm')._style('SUCCESS')
				])
			]
		});
	}

	/**
	 * enter modlog channel
	 */
	private async step3(_btnInt: ButtonInteraction, prevMessage: Message, _stage: number) {
		const row = this.container.utils.row();
		prevMessage.embeds[0].setFields([
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
		return prevMessage.edit({
			embeds: [prevMessage.embeds[0]],
			components: [
				row._components([
					this.container.utils.button()._customId('retry_modlog')._label('Retry')._style('SECONDARY'),
					this.container.utils.button()._customId('make_modlog')._label('Make a new modlog')._style('PRIMARY'),
					this.container.utils.button()._customId('confirm_modlog')._label('Confirm')._style('SUCCESS')
				])
			]
		});
	}

	/**
	 * is modlog private or public?
	 */
	private async step4(_btnInt: ButtonInteraction, prevMessage: Message, _stage: number) {
		const row = this.container.utils.row();
		prevMessage.embeds[0].setFields([
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
		return prevMessage.edit({
			embeds: [prevMessage.embeds[0]],
			components: [
				row._components([
					this.container.utils.button()._customId('private_modlog')._label('Private')._style('PRIMARY'),
					this.container.utils.button()._customId('public_modlog')._label('Public')._style('PRIMARY')
				])
			]
		});
	}
}
