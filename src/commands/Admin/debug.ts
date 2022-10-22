import { RadonCommand, RadonPaginatedMessage } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { mins } from '#lib/utility';
import { Emojis, RecommendedPermissions, RecommendedPermissionsWithoutAdmin } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import type { Guild } from 'discord.js';
import { PermissionFlagsBits } from 'discord-api-types/v9';

@ApplyOptions<RadonCommand.Options>({
	description: 'Analyze server config',
	permissionLevel: PermissionLevels.Administrator,
	cooldownDelay: mins(1),
	cooldownLimit: 2
})
export class UserCommand extends RadonCommand {
	readonly #SelectMessages = [
		['Server Setup', 'The /setup'],
		['Server Permissions', 'The permissions of server'], //
		['Per Channel Permissions', 'The per channel perms especially for locking mechanism'],
		['Roles', 'The Role range for server'],
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
					.setDescription(this.description),
			{ idHints: ['', '1027861261842657301'] }
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

		let result = `> Server Permissions `;

		const me = interaction.guild.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
		const missing = this.container.utils.format(me.permissions.missing(RecommendedPermissions)).map((p) => this.note(p));
		const hasGoodPerms = !missing.length;
		if (hasGoodPerms) {
			result = result.concat(`${Emojis.Forward} Perfect!\n`);
		} else {
			result = result.concat(`${Emojis.Forward} Permissions missing!\n${missing.join('')}\n`);
		}
		return result;
	}

	private async setupCheck(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply(`Checking Setup...`);

		const modlog = await interaction.guild.settings?.modlogs.modLogs_exist();
		const mods = await interaction.guild.settings?.roles.mods;
		const admins = await interaction.guild.settings?.roles.admins;

		let result = `> Server Setup `;

		const issues: string[] = [];

		if (modlog) {
			const channel = interaction.guild.channels.cache.get(modlog);
			if (!channel) issues.push(this.note(`No Modlogs channel found with ID \`${modlog}\``));
		} else issues.push(this.note(`No Modlogs channel setup found`));

		const roles = [mods, admins];
		for (let k = 0; k < 2; k++) {
			const impRole = roles.shift()!;
			const key = k === 0 ? 'Moderator' : 'Admin';
			if (impRole.length) {
				const roles = impRole.map((r) => interaction.guild.roles.cache.get(r));
				for (let i = 0; i < roles.length; i++) {
					const role = roles[i];
					if (!role) issues.push(this.note(`No ${key} Role found with ID \`${impRole[i]}\``));
				}
			} else issues.push(this.note(`No ${key} Roles setup found`));
		}

		if (issues.length) result = result.concat(`${Emojis.Forward} Issues found!\n${issues.join('\n')}\n`);
		else result = result.concat(`${Emojis.Forward} Perfect!\n`);
		return result;
	}

	private async perChannelPermissions(interaction: RadonCommand.ChatInputCommandInteraction) {
		await interaction.editReply(`Checking per channel overwrites...`);

		let result = `> Per Channel Permissions `;

		const channels = interaction.guild.channels.cache.filter((c) => c.type !== 'GUILD_CATEGORY');
		const me = interaction.guild.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
		const modifiedChannels: string[] = [];

		for (const channel of channels.values()) {
			const perm = channel.permissionsFor(me);
			const missing = this.container.utils.format(perm.missing(RecommendedPermissionsWithoutAdmin)).map((c) => `\`${c}\``);
			if (missing.length) {
				modifiedChannels.push(`<#${channel.id}> [${missing.length > 3 ? `${missing.length} Permissions` : `${missing.join(', ')}`}] `);
			}
		}

		if (modifiedChannels.length)
			result = result.concat(`${Emojis.Forward} Permission Overwrites found!\n${modifiedChannels.map((c) => this.note(c)).join('\n')}`);
		else result = result.concat(`${Emojis.Forward} Perfect!`);

		return result;
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

		const totalRoles = guild.roles.cache.size; // 50
		const me = guild.me ?? (await guild.members.fetch(client.user.id));
		const topRole = me.roles.highest; // at position 45

		if (topRole.position / totalRoles <= 0.7)
			notes.push(this.note(`My highest role [${topRole}] is quite low in the hierarchy! Most moderation actions will be affected`));
		if (topRole.id === guild.id)
			notes.push(
				this.note('My highest Role is @everyone and it will cause issues with moderation commands, please assign a higher role to me!')
			);

		if (!notes.length) return `> Role Hierarchy ${Emojis.Forward} Perfect!`;
		notes.unshift(`> Role Hierarchy ${Emojis.Forward} Issues Found!`);
		return notes.join('\n');
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
