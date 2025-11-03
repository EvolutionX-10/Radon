import { RadonCommand, RadonPaginatedMessage } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { mention, mins } from '#lib/utility';
import { Emojis, RecommendedPermissionsWithoutAdmin } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, Guild, InteractionContextType } from 'discord.js';
import { PermissionFlagsBits } from 'discord-api-types/v9';

@ApplyOptions<RadonCommand.Options>({
	description: 'Analyze server',
	permissionLevel: PermissionLevels.Administrator,
	cooldownDelay: mins(1),
	cooldownLimit: 2
})
export class UserCommand extends RadonCommand {
	readonly #SelectMessages = [
		['Server Setup', 'The /setup'],
		['Server Permissions', 'My permissions in the server'], //
		['Per Channel Permissions', 'The per channel perms especially for locking mechanism'],
		['Roles', 'The amount of roles in server'],
		['Role Hierarchy', 'The order of roles in server']
	];

	readonly #Counts = {
		Low: { Admins: { min: 1, max: 3 }, Roles: { min: 5, max: 20 } },
		Medium: { Admins: { min: 1, max: 5 }, Roles: { min: 10, max: 50 } },
		High: { Admins: { min: 2, max: 10 }, Roles: { min: 10, max: 100 } }
	};

	readonly #GuildSize = {
		Low: 50,
		Medium: 10000,
		High: 500000
	};

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
			{ idHints: ['1037359307232137297', '1027861261842657301'] }
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const title = '__**Results**__';

		const msg = new RadonPaginatedMessage() //
			.setSelectMenuPlaceholder('View Results')
			.setSelectMenuOptions((i) => ({ label: this.#SelectMessages[i - 1][0], description: this.#SelectMessages[i - 1][1] }));

		const results: string[] = [];

		await interaction.reply(`Debugging...`);

		results.push(await this.setupCheck(interaction));
		results.push(await this.guildPermissions(interaction));
		results.push(await this.perChannelPermissions(interaction));
		results.push(await this.roleCheck(interaction));
		results.push(await this.roleHierarchy(interaction));

		results.forEach((r, i) => msg.addPageContent(`${title} [${i + 1}/${this.#SelectMessages.length}]\n${r}`));

		return msg.run(interaction);
	}

	private async guildPermissions(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply(`Checking Overall Permissions...`);

		const notes: string[] = [];

		const me = interaction.guild.members.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
		notes.push(...this.container.utils.format(me.permissions.missing(RecommendedPermissionsWithoutAdmin)).map((p) => this.note(p)));

		if (!notes.length) return `> Server Permissions ${Emojis.Forward} Perfect!`;
		notes.unshift(`> Server Permissions ${Emojis.Forward} Permissions Missing!`);

		return notes.join('\n');
	}

	private async setupCheck(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply(`Checking Setup...`);

		const modlog = await interaction.guild.settings?.modlogs.modLogs_exist();
		const mods = await interaction.guild.settings?.roles.mods;
		const admins = await interaction.guild.settings?.roles.admins;

		const notes: string[] = [];

		if (modlog) {
			const channel = interaction.guild.channels.cache.get(modlog);
			if (!channel) notes.push(this.note(`No Modlogs channel found with ID \`${modlog}\``));
		} else notes.push(this.note(`No Modlogs channel setup found`));

		const roles = [mods, admins];
		for (let k = 0; k < 2; k++) {
			const impRole = roles.shift()!;
			const key = k === 0 ? 'Moderator' : 'Admin';
			if (impRole.length) {
				const roles = impRole.map((r) => interaction.guild.roles.cache.get(r));
				for (let i = 0; i < roles.length; i++) {
					const role = roles[i];
					if (!role) notes.push(this.note(`No ${key} Role found with ID \`${impRole[i]}\``));
				}
			} else notes.push(this.note(`No ${key} Roles setup found`));
		}

		if (!notes.length) return `> Server Setup ${Emojis.Forward} Perfect!`;
		notes.unshift(`> Server Setup ${Emojis.Forward} Issues found!`);

		return notes.join('\n').concat(`\n\n> *TIP: Use ${await mention('setup', interaction.client)} to fix the issues*`);
	}

	private async perChannelPermissions(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply(`Checking per channel overwrites...`);

		const channels = interaction.guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory);
		const me = interaction.guild.members.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
		const notes: string[] = [];

		for (const channel of channels.values()) {
			const perm = channel.permissionsFor(me);
			const missing = this.container.utils.format(perm.missing(RecommendedPermissionsWithoutAdmin)).map((c) => `\`${c}\``);
			if (missing.length) {
				notes.push(this.note(`<#${channel.id}> [${missing.length > 3 ? `${missing.length} Permissions` : `${missing.join(', ')}`}] `));
			}
		}

		if (!notes.length) return `> Per Channel Permissions ${Emojis.Forward} Perfect!`;
		notes.unshift(`> Per Channel Permissions ${Emojis.Forward} Permission Overwrites found!`);

		return notes
			.join('\n')
			.concat(
				'\n\n> *Tip: Granting `Administrator` Permission can solve all permission related issues, but it is not a necessity for me to function!*'
			);
	}

	private async roleCheck(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply(`Checking Roles...`);

		const { guild } = interaction;
		const notes: string[] = [];
		const roles = (await guild.roles.fetch()).filter((r) => !r.managed);
		const { everyone } = guild.roles;
		const admins = roles.filter((r) => r.permissions.has(PermissionFlagsBits.Administrator)).size;
		const totalRoles = roles.size;

		const counts = this.getRecommendedCounts(guild);

		const size = (max: number, cur: number, min: number) => (Math.min(max - cur, cur - min) === max - cur ? 'High' : 'Low');

		if (!this.range(counts.Admins.max, admins, counts.Admins.min))
			notes.push(
				this.note(`Too ${size(counts.Admins.max, admins, counts.Admins.min)} [**${admins}**] amount of Roles with Administrator Permissions!`)
			);
		if (!this.range(counts.Roles.max, totalRoles, counts.Roles.min))
			notes.push(this.note(`Too ${size(counts.Roles.max, totalRoles, counts.Roles.min)} [**${totalRoles}**] amount of Roles in Server!`));

		if (everyone.permissions.has(PermissionFlagsBits.Administrator)) {
			notes.push(this.note(`@everyone Role should **NOT** have Administrator Permissions!`));
		}

		if (!notes.length) return `> Role Check ${Emojis.Forward} Perfect!`;
		notes.unshift(`> Role Check ${Emojis.Forward} Issues Found!`);

		return notes.join('\n');
	}

	private async roleHierarchy(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply('Checking Role Hierarchy...');

		const { guild, client } = interaction;
		const notes: string[] = [];

		const totalRoles = guild.roles.cache.size;
		const me = guild.members.me ?? (await guild.members.fetch(client.user.id));
		const topRole = me.roles.highest;

		if (topRole.position / totalRoles <= 0.7) notes.push(this.note(`My highest role [${topRole}] is quite low in the hierarchy!`));
		if (topRole.id === guild.id)
			notes.push(this.note('My highest Role is @everyone and it will cause issues with commands, please assign a higher role to me!'));

		if (!notes.length) return `> Role Hierarchy ${Emojis.Forward} Perfect!`;
		notes.unshift(`> Role Hierarchy ${Emojis.Forward} Issues Found!`);

		return notes.join('\n').concat(`\n\n> *Tip: Role Hierarchy plays important role in moderating people!*`);
	}

	private getRecommendedCounts(guild: Guild) {
		const { memberCount } = guild;
		let guildSize: Size = 'Low';
		if (memberCount >= this.#GuildSize.Medium) guildSize = 'Medium';
		if (memberCount >= this.#GuildSize.High) guildSize = 'High';
		return this.#Counts[guildSize];
	}

	private range(max: number, x: number, min: number) {
		return x >= min && x <= max;
	}

	private note(text: string) {
		return `\` - \` ${text}`;
	}
}

type Size = 'High' | 'Medium' | 'Low';
