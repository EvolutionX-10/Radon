import { v2 } from '../../lib/presentation/components.js';
import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { clean } from 'confusables';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord-api-types/v9';
import { InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Manage nicknames`,
	requiredClientPermissions: ['ManageNicknames'],
	permissionLevel: PermissionLevels.Moderator
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();
		switch (subcmd as SubCommand) {
			case 'set':
				return this.set(interaction);
			case 'clear':
				return this.clear(interaction);
			case 'decancer':
				return this.decancer(interaction);
			case 'freeze':
				return this.freeze(interaction);
			case 'unfreeze':
				return this.unfreeze(interaction);
		}
	}

	public override async contextMenuRun(interaction: RadonCommand.UserContextMenuCommandInteraction) {
		return this.decancer(interaction);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
					.addSubcommand((builder) =>
						builder //
							.setName('decancer')
							.setDescription('Decancer the username of the member')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription("The member who's nickname to decancer")
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('set')
							.setDescription('Set a nickname for the member')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription("The member who's nickname to set")
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('nickname')
									.setDescription('The nickname to set')
									.setMaxLength(32)
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('The reason for the nickname change')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('clear')
							.setDescription('Clear the nickname of the member')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription("The member who's nickname to clear")
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('The reason for the nickname clear')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('freeze')
							.setDescription('Freeze a nickname')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription("The member who's nickname to freeze")
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('nickname')
									.setDescription('The nickname to set (defaults to current nickname/username)')
									.setMaxLength(32)
									.setRequired(false)
							)
							.addStringOption((option) =>
								option //
									.setName('reason')
									.setDescription('The reason for the nickname freeze')
									.setRequired(false)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('unfreeze')
							.setDescription('Unfreeze a nickname')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription(`The member who's nickname to unfreeze`)
									.setRequired(true)
							)
					),
			{ idHints: ['954251737290661939', '1019932090562789397'] }
		);
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Nick Decancer')
					.setType(ApplicationCommandType.User)
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
			{ idHints: ['954251739077431346', '1019932092592820294'] }
		);
	}

	private async decancer(interaction: RadonCommand.ChatInputCommandInteraction | RadonCommand.UserContextMenuCommandInteraction) {
		const member = interaction.options.getMember('target') ?? interaction.options.getMember('user');
		if (!member) {
			return interaction.reply(
				v2(
					{
						content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const reason = `Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild.ownerId) {
			return interaction.reply(
				v2(
					{
						content: `${Emojis.Cross} I cannot decancer the owner of the server`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const { result, content } = runAllChecks(interaction.member, member, 'nickname decancer');
		if (!result) {
			return interaction.reply(
				v2(
					{
						content,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const { displayName } = member;
		const nickname = clean(displayName).replace(/[^a-z 0-9]+/gi, '');

		if (nickname === displayName) {
			return interaction.reply(
				v2(
					{
						content: `No changes were made to ${displayName}!`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		await member.setNickname(nickname, reason);
		return interaction.reply(
			v2(
				{
					content: `Nickname \`${nickname}\` set for ${member} [DECANCER]`,
					flags: interaction.isContextMenuCommand() ? MessageFlags.Ephemeral : undefined
				},
				'Radon · Nick'
			)
		);
	}

	private async set(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member) {
			return interaction.reply(
				v2(
					{
						content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const nickname = interaction.options.getString('nickname', true);
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;

		if (member.id === interaction.guild.ownerId) {
			return interaction.reply(
				v2(
					{
						content: 'I cannot set the nickname of the server owner',
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}

		const { result, content } = runAllChecks(interaction.member, member, 'nickname set');
		if (!result) {
			return interaction.reply(
				v2(
					{
						content,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}

		if (member.displayName === nickname) {
			return interaction.reply(
				v2(
					{
						content: `${member}'s display name is already set to ${nickname}`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		await member.setNickname(nickname, reason);
		return interaction.reply(
			v2(
				{
					content: `Nickname \`${nickname}\` set for ${member}`
				},
				'Radon · Nick'
			)
		);
	}

	private async clear(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member) {
			return interaction.reply(
				v2(
					{
						content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild.ownerId) {
			return interaction.reply(
				v2(
					{
						content: 'I cannot clear the nickname of the server owner',
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const { result, content } = runAllChecks(interaction.member, member, 'nickname clear');
		if (!result) {
			return interaction.reply(
				v2(
					{
						content,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		if (!member.nickname) {
			return interaction.reply(
				v2(
					{
						content: `${member} does not have a nickname`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		await member.setNickname(null, reason);
		return interaction.reply(
			v2(
				{
					content: `Nickname cleared for ${member}`
				},
				'Radon · Nick'
			)
		);
	}

	private async freeze(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member) {
			return interaction.reply(
				v2(
					{
						content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}
		const nick = interaction.options.getString('nickname') ?? member.displayName;
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;

		if (member.id === interaction.guild.ownerId) {
			return interaction.reply(
				v2(
					{
						content: 'I cannot set the nickname of the server owner',
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}

		const { result, content } = runAllChecks(interaction.member, member, 'freeze');
		if (!result) {
			return interaction.reply(
				v2(
					{
						content,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}

		if (nick !== member.displayName) await member.setNickname(nick, reason);

		const db = await interaction.guild.settings?.nicknames.get();
		if (db && db.freezed.includes(member.id))
			return interaction.reply(
				v2(
					{
						content: `${member}'s nickname is already freezed!`
					},
					'Radon · Nick'
				)
			);

		await interaction.guild.settings?.nicknames.push(member.id);

		return interaction.reply(
			v2(
				{
					content: `Successfully freezed nickname of ${member}!`
				},
				'Radon · Nick'
			)
		);
	}

	private async unfreeze(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');

		if (!member) {
			return interaction.reply(
				v2(
					{
						content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
						flags: MessageFlags.Ephemeral
					},
					'Radon · Nick'
				)
			);
		}

		const nicks = await interaction.guild.settings?.nicknames.get();
		if (!nicks || (nicks && !nicks.freezed.includes(member.id)))
			return interaction.reply(
				v2(
					{
						content: `${member}'s nickname is NOT freezed!`
					},
					'Radon · Nick'
				)
			);

		await interaction.guild.settings?.nicknames.pull(member.id);

		return interaction.reply(
			v2(
				{
					content: `Sucessfully unfreezed ${member}'s nickname!`
				},
				'Radon · Nick'
			)
		);
	}
}

type SubCommand = 'set' | 'clear' | 'decancer' | 'freeze' | 'unfreeze';
