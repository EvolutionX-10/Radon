import { ApplyOptions } from '@sapphire/decorators';
import { RadonCommand } from '#lib/structures';
import { EmbedBuilder, InteractionContextType, MessageFlags } from 'discord.js';
import { Emojis } from '#constants';

@ApplyOptions<RadonCommand.Options>({
	description: 'Manage Guild Related Command'
})
export class UserCommand extends RadonCommand {
	readonly #WaitlistId = '1322121858153320520';

	readonly #GuildIdMap: Record<string, string> = {
		MYSTICKNIGHT: '1296559407185924226',
		'RISING-KNIGHT': '1301259231269355661',
		ARMAANMASHI4: '1296556857149620235',
		'THE SLAYERS': '1301224537358340096',
		RYUJIN: '1342595308797825144'
	};

	readonly #GuildChannelIdMap: Record<string, string> = {
		MYSTICKNIGHT: '1276602246246826047',
		'RISING-KNIGHT': '1301257711685599313',
		ARMAANMASHI4: '1301223586811351083',
		'THE SLAYERS': '1301224537358340096',
		RYUJIN: '1342941110787637328'
	};

	readonly #GifList: string[] = [
		'https://media1.tenor.com/m/SpXWQo0Mq7EAAAAd/welcome-michael-scott.gif',
		'https://media1.tenor.com/m/lO4POoZcaToAAAAd/you%27rebearywelcome-bear.gif',
		'https://media1.tenor.com/m/_CV7TgcAtLYAAAAd/welcome-to-the-team.gif',
		'https://media1.tenor.com/m/FitlaSR2PygAAAAd/were-happy-to-have-you-ralph-macchio.gif',
		'https://media1.tenor.com/m/PsRX-hjYNs8AAAAd/make-yourself-comfortable-jimmy-kwon.gif',
		'https://media1.tenor.com/m/WrG9kgsAoLwAAAAd/minions-excited.gif',
		'https://media1.tenor.com/m/fpV02dUZp68AAAAd/gamer-guild-welcome.gif'
	];

	readonly #AuthorityIds: string[] = [
		'1309949497752813608', // Moderator
		'1320010402557464616', // Guild Master
		'1320010453757202474' // Vice Guild Master
	];

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand() as SubCommand;

		const possibleRoles = interaction.member.roles.cache.filter((role) => this.#AuthorityIds.includes(role.id));
		if (!possibleRoles.size) return interaction.reply({ content: 'You do not have the required permissions to use this command!' });

		switch (subcmd) {
			case 'add':
				return this.addGuildMember(interaction);
			case 'remove':
				return this.removeGuildMember(interaction);
		}
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
							.setDescription('Add a member to a guild')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('The member to add')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('guild')
									.setDescription('The guild to add the member to')
									.setChoices(Object.keys(this.#GuildIdMap).map((key) => ({ name: key, value: key })))
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('remove')
							.setDescription('Remove a member from every guild')
							.addUserOption((option) =>
								option //
									.setName('target')
									.setDescription('The member to remove')
									.setRequired(true)
							)
					),
			{
				guildIds: ['1276602245689114725'],
				idHints: ['1343596093161734156'],
				registerCommandIfMissing: false
			}
		);
	}

	private async addGuildMember(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member || member.user.bot)
			return interaction.reply({ content: 'You must provide a valid member to add', flags: MessageFlags.Ephemeral });

		const guildName = interaction.options.getString('guild', true);
		const roleId = this.#GuildIdMap[guildName];

		if (!roleId) return interaction.reply({ content: 'You must provide a valid guild to add the member to', flags: MessageFlags.Ephemeral });

		const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
		if (!role) return interaction.reply({ content: 'I could not find that guild', flags: MessageFlags.Ephemeral });

		if (role.position > interaction.guild.members.me!.roles.highest!.position)
			return interaction.reply({
				content: `${Emojis.Cross} I can't add ${role} because its position is higher than my highest role!`
			});

		if (member.roles.cache.has(role.id)) return interaction.reply(`${member} is already in ${guildName}`);

		const added = await member.roles.add(roleId).catch(() => null);
		await member.roles.remove(this.#WaitlistId).catch(() => null);

		if (!added) {
			return interaction.reply({ content: `${Emojis.Cross} I could not add ${member} to ${guildName}` });
		}

		const guildChannel = await interaction.guild.channels.fetch(this.#GuildChannelIdMap[guildName]).catch(() => null);

		if (guildChannel && guildChannel.isSendable()) {
			const randomGif = this.#GifList[Math.floor(Math.random() * this.#GifList.length)];
			const embed = new EmbedBuilder() //
				.setTitle(`Welcome ${member.displayName}`)
				.setImage(randomGif)
				.setColor(role.color)
				.setTimestamp()
				.setFooter({
					text: `Made with ❤️ by Evo`,
					iconURL: `https://cdn.discordapp.com/avatars/697795666373640213/feb4fe1b8f2d174b4d66d970c9fc88ef.webp`
				});
			await guildChannel.send({
				content: `Everyone Welcome ${member} to ${guildName}`,
				embeds: [embed]
			});
		}

		return interaction.reply({ content: `${Emojis.Confirm} Added ${member} to ${guildName}` });
	}

	private async removeGuildMember(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member || member.user.bot) return interaction.reply({ content: 'You must provide a valid member to remove' });

		const memberRoles = member.roles.cache.map((role) => role.id);
		const possibleRoles = Object.values(this.#GuildIdMap).filter((guildId) => memberRoles.includes(guildId));
		if (possibleRoles.length === 0) return interaction.reply({ content: `${member} is not in any guild` });

		await Promise.all(possibleRoles.map((roleId) => member.roles.remove(roleId)));
		return interaction.reply({ content: `${Emojis.Confirm} Removed ${member} from all guilds` });
	}
}

type SubCommand = 'add' | 'remove';
