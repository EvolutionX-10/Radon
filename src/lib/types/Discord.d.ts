import type { GuildTextBasedChannelTypes } from '@sapphire/discord.js-utilities';
import type {
	BaseGuildTextChannel,
	CommandInteraction,
	CommandInteractionOptionResolver,
	ContextMenuInteraction,
	DMChannel,
	Guild,
	GuildBasedChannel,
	GuildChannel,
	GuildMember,
	Message,
	Role,
	TextBasedChannel,
	TextChannel,
	VoiceBasedChannel
} from 'discord.js';

export interface GuildMessage extends Message {
	channel: GuildTextBasedChannelTypes;
	readonly guild: Guild;
	readonly member: GuildMember;
}

export interface DMMessage extends Message {
	channel: DMChannel;
	readonly guild: null;
	readonly member: null;
}

export type MessageAcknowledgeable = TextChannel | GuildMessage;

export interface GuildInteraction extends CommandInteraction {
	readonly guild: Guild;
	readonly guildId: string;
	readonly member: GuildMember;
	readonly channel: TextChannel;
	options: GuildCommandInteractionOptionResolver;
}

export interface GuildContextMenuInteraction extends ContextMenuInteraction {
	readonly guild: Guild;
	readonly guildId: string;
	readonly member: GuildMember;
	options: GuildCommandInteractionOptionResolver;
}

export interface GuildCommandInteractionOptionResolver extends CommandInteractionOptionResolver {
	getMember(name: string): GuildMember;
	getChannel(name: string, required?: boolean): GuildBasedChannel;
	getRole(name: string, required?: boolean): Role;
}
