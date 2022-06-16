import type { RadonClient } from '#lib/RadonClient';
import type { GuildChannel, TextBasedChannel } from 'discord.js';

export function getCache(client: RadonClient) {
	const guildCacheSize = client.guilds.cache.size;
	const userCacheSize = client.users.cache.size;
	const roleCacheSize = client.guilds.cache.reduce((c, g) => c + g.roles.cache.size, 0);
	const emoteCacheSize = client.emojis.cache.size;
	const messagesCacheSize = client.guilds.cache.reduce(
		(c, g) => c + g.channels.cache.filter((w) => w.isText()).reduce((e, f) => e + (f as TextBasedChannel).messages?.cache.size, 0),
		0
	);
	const voiceChannelCacheSize = client.channels.cache.filter((c) => c.type === 'GUILD_VOICE').size;
	const textChannelCacheSize = client.channels.cache.filter((c) => c.type === 'GUILD_TEXT').size;
	const categoryChannelCacheSize = client.channels.cache.filter((c) => c.type === 'GUILD_CATEGORY').size;
	const dmChannelCacheSize = client.channels.cache.filter((c) => c.type === 'DM').size;
	const threadChannelCacheSize = client.channels.cache.filter((c) => c.type === 'GUILD_PUBLIC_THREAD').size;
	const totalChannelCacheSize = client.channels.cache.size;
	const memberCacheSize = client.guilds.cache.reduce((c, g) => c + g.members.cache.size, 0);
	const bansCacheSize = client.guilds.cache.reduce((c, g) => c + g.bans.cache.size, 0);
	const presenceCacheSize = client.guilds.cache.reduce((c, g) => c + g.members.cache.filter((m) => m.presence?.status).size, 0);
	const reactionCacheSize = client.channels.cache
		.filter((c) => c.isText())
		.reduce((c, g) => c + (g as TextBasedChannel).messages.cache.reduce((c, m) => c + m.reactions.cache.size, 0), 0);
	const voiceCacheSize = client.guilds.cache.reduce((c, g) => c + g.voiceStates.cache.size, 0);
	const inviteCacheSize = client.guilds.cache.reduce((c, g) => c + g.invites.cache.size, 0);
	const stickerCacheSize = client.guilds.cache.reduce((c, g) => c + g.stickers.cache.size, 0);
	const permsOverwriteCacheSize = client.guilds.cache.reduce(
		(c, g) =>
			c +
			g.channels.cache
				.filter((e) => (e.guildId && !e.isThread() ? true : false))
				.reduce((c, e) => c + (e as GuildChannel).permissionOverwrites.cache.size, 0),
		0
	);
	let content = `Cache Factory\n___________________________\n`;
	content += `Guilds: ${guildCacheSize}\n`;
	content += `Users: ${userCacheSize}\n`;
	content += `Roles: ${roleCacheSize}\n`;
	content += `Emojis: ${emoteCacheSize}\n`;
	content += `Messages: ${messagesCacheSize}\n`;
	content += `Members: ${memberCacheSize}\n`;
	content += `Voice_Channels: ${voiceChannelCacheSize}\n`;
	content += `Text_Channels: ${textChannelCacheSize}\n`;
	content += `Category_Channels: ${categoryChannelCacheSize}\n`;
	content += `Direct_Messages: ${dmChannelCacheSize}\n`;
	content += `Thread_Channels: ${threadChannelCacheSize}\n`;
	content += `Total_Channels: ${totalChannelCacheSize}\n`;
	content += `Bans: ${bansCacheSize}\n`;
	content += `Presences: ${presenceCacheSize}\n`;
	content += `Reactions: ${reactionCacheSize}\n`;
	content += `Voice_States: ${voiceCacheSize}\n`;
	content += `Invites: ${inviteCacheSize}\n`;
	content += `Stickers: ${stickerCacheSize}\n`;
	content += `Permission_Overwrites: ${permsOverwriteCacheSize}\n`;
	content += `___________________________\nTotal: ${
		guildCacheSize +
		userCacheSize +
		roleCacheSize +
		emoteCacheSize +
		messagesCacheSize +
		memberCacheSize +
		voiceChannelCacheSize +
		textChannelCacheSize +
		categoryChannelCacheSize +
		dmChannelCacheSize +
		threadChannelCacheSize +
		totalChannelCacheSize +
		bansCacheSize +
		presenceCacheSize +
		reactionCacheSize +
		voiceCacheSize +
		inviteCacheSize +
		stickerCacheSize +
		permsOverwriteCacheSize
	}`;
	return content;
}
