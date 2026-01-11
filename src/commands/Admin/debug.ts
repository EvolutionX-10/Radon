import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { mention, mins } from '#lib/utility';
import { Emojis, RecommendedPermissionsWithoutAdmin } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, ContainerBuilder, Guild, heading, HeadingLevel, InteractionContextType, MessageFlags } from 'discord.js';
import { PermissionFlagsBits } from 'discord-api-types/v9';

@ApplyOptions<RadonCommand.Options>({
	description: 'Analyze server',
	permissionLevel: PermissionLevels.Administrator,
	cooldownDelay: mins(1),
	cooldownLimit: 2
})
export class UserCommand extends RadonCommand {
	readonly #Counts = {
		Low: { Admins: { min: 1, max: 3 }, Roles: { min: 5, max: 25 } },
		Medium: { Admins: { min: 1, max: 5 }, Roles: { min: 10, max: 50 } },
		High: { Admins: { min: 2, max: 10 }, Roles: { min: 10, max: 100 } }
	};

	readonly #GuildSize = {
		Low: 50,
		Medium: 500,
		High: 1000
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
		const title = heading('Server Debug Report');
		const results: string[] = [];

		await interaction.deferReply();

		results.push(await this.setupCheck(interaction));
		results.push(await this.guildPermissions(interaction));
		results.push(await this.perChannelPermissions(interaction));
		results.push(await this.roleCheck(interaction));
		results.push(await this.roleHierarchy(interaction));

		const container = new ContainerBuilder() //
			.addTextDisplayComponents((textDisplay) =>
				textDisplay //
					.setContent(title)
			)
			.addSeparatorComponents((s) => s);

		for (let i = 0; i < results.length; i++) {
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay //
					.setContent(results[i])
			);
		}

		return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
	}

	private async guildPermissions(interaction: RadonCommand.ChatInputCommandInteraction) {
		const notes: string[] = [heading('Server Permissions', HeadingLevel.Two)];

		const me = interaction.guild.members.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
		notes.push(...this.container.utils.format(me.permissions.missing(RecommendedPermissionsWithoutAdmin)).map((p) => this.note(p)));

		if (notes.length === 1) {
			notes.push(`${Emojis.Confirm} All Recommended Permissions Present!`);
			return notes.join('\n');
		}
		notes.splice(1, 0, `${Emojis.Cross} Permissions Missing!`);

		return notes.join('\n');
	}

	private async setupCheck(interaction: RadonCommand.ChatInputCommandInteraction) {
		const modlog = await interaction.guild.settings?.modlogs.modLogs_exist();
		const mods = await interaction.guild.settings?.roles.mods;
		const admins = await interaction.guild.settings?.roles.admins;

		const notes: string[] = [heading('Server Setup', HeadingLevel.Two)];

		if (modlog) {
			const channel = interaction.guild.channels.cache.get(modlog);
			if (!channel) notes.push(this.note(`No Modlogs channel found with ID \`${modlog}\``));
		} else notes.push(this.note('No Modlogs channel setup found'));

		const roles = [mods, admins];
		for (let k = 0; k < 2; k++) {
			const impRole = roles.shift()!;
			const key = k === 0 ? 'Moderator' : 'Admin';
			if (impRole.length) {
				const roles = impRole.map((r) => interaction.guild.roles.cache.get(r));
				for (let i = 0; i < roles.length; i++) {
					const role = roles[i];
					if (!role) notes.push(this.note(`No ${key} role found with ID \`${impRole[i]}\``));
				}
			} else notes.push(this.note(`No ${key} roles setup found`));
		}

		if (notes.length === 1) {
			notes.push(`${Emojis.Confirm} All required setup found!`);
			return notes.join('\n');
		}

		notes.splice(1, 0, `${Emojis.Cross} Setup issues found!`);
		notes.push('', `*Tip: Use ${await mention('setup', interaction.client)} to fix the issues.*`);

		return notes.join('\n');
	}

	private async perChannelPermissions(interaction: RadonCommand.ChatInputCommandInteraction) {
		const channels = interaction.guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory);
		const me = interaction.guild.members.me ?? (await interaction.guild.members.fetch(interaction.client.user.id));
		const notes: string[] = [heading('Per-Channel Permissions', HeadingLevel.Two)];

		for (const channel of channels.values()) {
			const perm = channel.permissionsFor(me);
			const missing = this.container.utils.format(perm.missing(RecommendedPermissionsWithoutAdmin)).map((c) => `\`${c}\``);
			if (missing.length) {
				notes.push(this.note(`<#${channel.id}> [${missing.length > 3 ? `${missing.length} Permissions` : `${missing.join(', ')}`}]`));
			}
		}

		if (notes.length === 1) {
			notes.push(`${Emojis.Confirm} All channel overwrites look good!`);
			return notes.join('\n');
		}

		notes.splice(1, 0, `${Emojis.Cross} Permission overwrites found!`);
		notes.push(
			'',
			'*Tip: Granting Administrator solves every permission issue, but it is not required for me to function. Prefer scoped fixes per channel.*'
		);

		return notes.join('\n');
	}

	private async roleCheck(interaction: RadonCommand.ChatInputCommandInteraction) {
		const { guild } = interaction;
		const notes: string[] = [heading('Role Check', HeadingLevel.Two)];
		const roles = (await guild.roles.fetch()).filter((r) => !r.managed);
		const { everyone } = guild.roles;
		const admins = roles.filter((r) => r.permissions.has(PermissionFlagsBits.Administrator)).size;
		const totalRoles = roles.size;

		const counts = this.getRecommendedCounts(guild);

		const size = (max: number, cur: number, min: number) => (Math.min(max - cur, cur - min) === max - cur ? 'High' : 'Low');

		if (!this.range(counts.Admins.max, admins, counts.Admins.min))
			notes.push(
				this.note(`Too ${size(counts.Admins.max, admins, counts.Admins.min)} [**${admins}**] amount of roles with Administrator Permissions!`)
			);
		if (!this.range(counts.Roles.max, totalRoles, counts.Roles.min))
			notes.push(this.note(`Too ${size(counts.Roles.max, totalRoles, counts.Roles.min)} [**${totalRoles}**] amount of roles in server!`));

		if (everyone.permissions.has(PermissionFlagsBits.Administrator)) {
			notes.push(this.note('@everyone role should **NOT** have Administrator Permission!'));
		}

		if (notes.length === 1) {
			notes.push(`${Emojis.Confirm} Roles and permissions look balanced!`);
			return notes.join('\n');
		}

		notes.splice(1, 0, `${Emojis.Cross} Role issues found!`);

		return notes.join('\n');
	}

	private async roleHierarchy(interaction: RadonCommand.ChatInputCommandInteraction) {
		const { guild, client } = interaction;
		const notes: string[] = [heading('Role Hierarchy', HeadingLevel.Two)];

		const totalRoles = guild.roles.cache.size;
		const me = guild.members.me ?? (await guild.members.fetch(client.user.id));
		const topRole = me.roles.highest;

		if (topRole.position / totalRoles <= 0.7) notes.push(this.note(`My highest role [${topRole}] is quite low in the hierarchy!`));
		if (topRole.id === guild.id)
			notes.push(this.note('My highest Role is @everyone and it will cause issues with commands, please assign a higher role to me!'));

		if (notes.length === 1) {
			notes.push(`${Emojis.Confirm} Role hierarchy is healthy!`);
			return notes.join('\n');
		}

		notes.splice(1, 0, `${Emojis.Cross} Hierarchy issues found!`);
		notes.push('', '*Tip: Role hierarchy is critical for moderation actions to work reliably.*');

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
