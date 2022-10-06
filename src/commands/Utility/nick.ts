import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { clean } from 'confusables';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord-api-types/v9';

@ApplyOptions<RadonCommand.Options>({
	description: `Manage nicknames`,
	requiredClientPermissions: ['MANAGE_NICKNAMES'],
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
		}
	}

	public override async contextMenuRun(interaction: RadonCommand.ContextMenuCommandInteraction) {
		return this.decancer(interaction);
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false)
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
					),
			{ idHints: ['954251737290661939', '1019932090562789397'] }
		);
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Nick Decancer')
					.setType(ApplicationCommandType.User)
					.setDMPermission(false)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
			{ idHints: ['954251739077431346', '1019932092592820294'] }
		);
	}

	private async decancer(interaction: RadonCommand.ChatInputCommandInteraction | RadonCommand.ContextMenuCommandInteraction) {
		const member = interaction.options.getMember('target') ?? interaction.options.getMember('user');
		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				ephemeral: true
			});
		}
		const reason = `Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild.ownerId) {
			return interaction.reply({
				content: `${Emojis.Cross} I cannot decancer the owner of the server`,
				ephemeral: true
			});
		}
		const { result, content } = runAllChecks(interaction.member, member, 'nickname decancer');
		if (!result) {
			return interaction.reply({
				content,
				ephemeral: true
			});
		}
		const { displayName } = member;
		const nickname = clean(displayName).replace(/[^a-z 0-9]+/gi, '');

		if (nickname === displayName) {
			return interaction.reply({
				content: `No changes were made to ${displayName}!`,
				ephemeral: true
			});
		}
		await member.setNickname(nickname, reason);
		return interaction.reply(`${member.user.tag}'s display name has been decancered!`);
	}

	private async set(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				ephemeral: true
			});
		}
		const nickname = interaction.options.getString('nickname', true);
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;

		if (member.id === interaction.guild.ownerId) {
			return interaction.reply({
				content: 'I cannot set the nickname of the server owner',
				ephemeral: true
			});
		}

		const { result, content } = runAllChecks(interaction.member, member, 'nickname set');
		if (!result) {
			return interaction.reply({
				content,
				ephemeral: true
			});
		}

		if (member.displayName === nickname) {
			return interaction.reply({
				content: `${member}'s display name is already set to ${nickname}`,
				ephemeral: true
			});
		}
		await member.setNickname(nickname, reason);
		return interaction.reply({
			content: `Nickname \`${nickname}\` set for ${member}`
		});
	}

	private async clear(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member) {
			return interaction.reply({
				content: `${Emojis.Cross} You must specify a valid member that is in this server!`,
				ephemeral: true
			});
		}
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild.ownerId) {
			return interaction.reply({
				content: 'I cannot clear the nickname of the server owner',
				ephemeral: true
			});
		}
		const { result, content } = runAllChecks(interaction.member, member, 'nickname clear');
		if (!result) {
			return interaction.reply({
				content,
				ephemeral: true
			});
		}
		if (!member.nickname) {
			return interaction.reply({
				content: `${member} does not have a nickname`,
				ephemeral: true
			});
		}
		await member.setNickname(null, reason);
		return interaction.reply({
			content: `Nickname cleared for ${member}`
		});
	}
}

type SubCommand = 'set' | 'clear' | 'decancer';
