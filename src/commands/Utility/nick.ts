import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { runAllChecks } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandType } from 'discord-api-types/v9';
import type { GuildMember } from 'discord.js';
import { clean } from 'confusables';
@ApplyOptions<RadonCommand.Options>({
	description: `Manage nicknames`,
	requiredClientPermissions: ['MANAGE_NICKNAMES'],
	permissionLevel: PermissionLevels.Moderator
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();
		switch (subcmd) {
			case 'set':
				return this.set(interaction);
			case 'clear':
				return this.clear(interaction);
			case 'decancer':
				return this.decancer(interaction);
			default:
				return interaction.reply({
					content: `Error: \`${subcmd}\`\nPlease report this in the support server`,
					ephemeral: true
				});
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
					.addSubcommand((builder) =>
						builder //
							.setName('decancer')
							.setDescription('Decancer the username of the member')
							.addUserOption((option) =>
								option //
									.setName('member')
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
									.setName('member')
									.setDescription("The member who's nickname to set")
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('nickname')
									.setDescription('The nickname to set')
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
									.setName('member')
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
			{
				guildIds: vars.guildIds,
				idHints: ['954251737290661939', '954226414759055400']
			}
		);
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Decancer')
					.setType(ApplicationCommandType.User),
			{
				guildIds: vars.guildIds,
				idHints: ['954251739077431346', '954249587047170048']
			}
		);
	}

	private async decancer(interaction: RadonCommand.ChatInputCommandInteraction | RadonCommand.ContextMenuCommandInteraction) {
		const member = (interaction.options.getMember('member') || interaction.options.getMember('user')) as GuildMember;
		if (!member) {
			return interaction.reply({
				content: 'No member found',
				ephemeral: true
			});
		}
		const reason = `Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild?.ownerId) {
			return interaction.reply({
				content: 'I cannot decancer the owner of the server',
				ephemeral: true
			});
		}
		const { result, content } = runAllChecks(interaction.member as GuildMember, member, 'nickname decancer');
		if (!result) {
			return interaction.reply({
				content,
				ephemeral: true
			});
		}
		const name = member.displayName;
		let nickname = clean(name).replace(/[^a-z 0-9]+/gi, '');
		if (!nickname.length) nickname = 'Moderated Nickname';
		if (nickname === name) {
			return interaction.reply({
				content: `No changes were made to ${name}`,
				ephemeral: true
			});
		}
		await member.setNickname(nickname, reason);
		return interaction.reply(`${member.user.tag}'s display name has been decancered!`);
	}

	private async set(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member) {
			return interaction.reply({
				content: 'No member found',
				ephemeral: true
			});
		}
		const nickname = interaction.options.getString('nickname', true);
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild?.ownerId) {
			return interaction.reply({
				content: 'I cannot set the nickname of the guild owner',
				ephemeral: true
			});
		}
		const { result, content } = runAllChecks(interaction.member as GuildMember, member, 'nickname set');
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
			content: `Nickname \`${nickname}\` set for ${member.user.tag}`
		});
	}

	private async clear(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member) {
			return interaction.reply({
				content: 'No member found',
				ephemeral: true
			});
		}
		const reason =
			(interaction.options.getString('reason', false) ? `${interaction.options.getString('reason', false)} (${interaction.user.tag})` : null) ??
			`Done by ${interaction.user.tag}`;
		if (member.id === interaction.guild?.ownerId) {
			return interaction.reply({
				content: 'I cannot clear the nickname of the guild owner',
				ephemeral: true
			});
		}
		const { result, content } = runAllChecks(interaction.member as GuildMember, member, 'nickname clear');
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
			content: `Nickname cleared for ${member.user.tag}`
		});
	}
}
