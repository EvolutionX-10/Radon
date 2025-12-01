import { ApplyOptions } from '@sapphire/decorators';
import { RadonCommand } from '#lib/structures';
import { EmbedBuilder, InteractionContextType } from 'discord.js';
import { Emojis } from '#constants';
import { RegisterBehavior } from '@sapphire/framework';
import { isAdmin, isModerator } from '#lib/utility';

@ApplyOptions<RadonCommand.Options>({
	description: 'Manage Guild Related Command'
})
export class UserCommand extends RadonCommand {
	readonly #WaitlistId = '1322121858153320520';

	readonly #GuildIdMap: Record<string, string> = {
		MYSTICKNIGHT: '1296559407185924226',
		'RISING-KNIGHT': '1301259231269355661',
		'THE SLAYERS': '1301224537358340096',
		RYUJIN: '1342595308797825144',
		'DEATH EATERS': '1360865100847779861',
		'SHADOW GARDEN': '1407401254845677729',
		KOTBO: '1414709541819388008'
	};

	readonly #GuildChannelIdMap: Record<string, string> = {
		MYSTICKNIGHT: '1276602246246826047',
		'RISING-KNIGHT': '1301257711685599313',
		'THE SLAYERS': '1301223586811351083',
		RYUJIN: '1342941110787637328',
		'DEATH EATERS': '1360873117521543288',
		'SHADOW GARDEN': '1407414183590625290',
		KOTBO: '1414711679329239233'
	};

	readonly #GifList: string[] = [
		'https://c.tenor.com/SpXWQo0Mq7EAAAAd/tenor.gif', //Welcome aboard [TheOffice]
		'https://c.tenor.com/_CV7TgcAtLYAAAAd/tenor.gif', //Welcome to the fam [Cool_Penguin]
		'https://c.tenor.com/FitlaSR2PygAAAAd/tenor.gif', //we're happy to have you
		'https://c.tenor.com/PsRX-hjYNs8AAAAd/tenor.gif', //Make yourself comfortable
		'https://c.tenor.com/WrG9kgsAoLwAAAAd/tenor.gif', //Welcome to the club [minions]
		'https://c.tenor.com/fpV02dUZp68AAAAd/tenor.gif', //Welcome to gamer guild
		'https://c.tenor.com/peWLkbIayCEAAAAd/tenor.gif', //Welcome to the Club [Football_Manager]
		'https://c.tenor.com/2rEDY9t4690AAAAC/tenor.gif', //Thanks for joining us [Leonardo_DiCario]
		'https://c.tenor.com/Q1s3ZkqW0-YAAAAC/tenor.gif', //Holy shit look who's here
		'https://c.tenor.com/AvRN6GlmzXsAAAAC/tenor.gif', //Welcome to the family [Godfather]
		'https://c.tenor.com/mpmbsd82G14AAAAC/tenor.gif' //One of us [Wolf of wall street]
	];

	readonly #AuthorityIds: string[] = [
		'1444955256504062003' // Guild Officer
	];

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand() as SubCommand;

		const possibleRoles = interaction.member.roles.cache.filter((role) => this.#AuthorityIds.includes(role.id));
		if (!possibleRoles.size && !isModerator(interaction.member) && !isAdmin(interaction.member))
			return interaction.reply({ content: 'You do not have the required permissions to use this command!' });

		await interaction.deferReply();
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
							.addBooleanOption((option) =>
								option //
									.setName('welcome')
									.setDescription('Whether to send a welcome message [default: true]')
									.setRequired(false)
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
				idHints: ['1343596093161734156', '1377122511153791066'],
				behaviorWhenNotIdentical: RegisterBehavior.Overwrite
			}
		);
	}

	private async addGuildMember(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		const welcome = interaction.options.getBoolean('welcome') ?? true;

		if (!member || member.user.bot) return interaction.editReply({ content: 'You must provide a valid member to add' });

		const guildName = interaction.options.getString('guild', true);
		const roleId = this.#GuildIdMap[guildName];

		if (!roleId) return interaction.editReply({ content: 'You must provide a valid guild to add the member to' });

		const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
		if (!role) return interaction.editReply({ content: 'I could not find that guild' });

		if (role.position > interaction.guild.members.me!.roles.highest!.position)
			return interaction.editReply({
				content: `${Emojis.Cross} I can't add ${role} because its position is higher than my highest role!`
			});

		if (member.roles.cache.has(role.id)) return interaction.editReply({ content: `${member} is already in ${guildName}` });

		const added = await member.roles.add(roleId).catch(() => null);
		await member.roles.remove(this.#WaitlistId).catch(() => null);

		if (!added) {
			return interaction.editReply({ content: `${Emojis.Cross} I could not add ${member} to ${guildName}` });
		}

		const guildChannel = await interaction.guild.channels.fetch(this.#GuildChannelIdMap[guildName]).catch(() => null);
		const randomGif = this.#GifList[Math.floor(Math.random() * this.#GifList.length)];

		if (guildChannel && guildChannel.isSendable() && welcome) {
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

		const welcomeDMEmbed = new EmbedBuilder() //
			.setTitle(`Welcome to ${guildName}`)
			.setDescription(
				`You have been added to ${guildName} by ${interaction.user}\nGuild Chat Channel: <#${this.#GuildChannelIdMap[guildName]}>`
			)
			.setColor('Random')
			.setImage(randomGif)
			.setTimestamp()
			.setFooter({
				text: `Made with ❤️ by Evo`,
				iconURL: `https://cdn.discordapp.com/avatars/697795666373640213/feb4fe1b8f2d174b4d66d970c9fc88ef.webp`
			});

		await member.send({ embeds: [welcomeDMEmbed] }).catch(() => null);

		return interaction.editReply({ content: `${Emojis.Confirm} Added ${member} to ${guildName}` });
	}

	private async removeGuildMember(interaction: RadonCommand.ChatInputCommandInteraction) {
		const member = interaction.options.getMember('target');
		if (!member || member.user.bot) return interaction.editReply({ content: 'You must provide a valid member to remove' });

		const memberRoles = member.roles.cache.map((role) => role.id);
		const possibleRoles = Object.values(this.#GuildIdMap).filter((guildId) => memberRoles.includes(guildId));
		if (possibleRoles.length === 0) return interaction.editReply({ content: `${member} is not in any guild` });

		await Promise.all(possibleRoles.map((roleId) => member.roles.remove(roleId)));
		return interaction.editReply({ content: `${Emojis.Confirm} Removed ${member} from all guilds` });
	}
}

type SubCommand = 'add' | 'remove';
