import type { RadonClient } from '#lib/RadonClient';
import type { GuildTextBasedChannelTypes } from '@sapphire/discord.js-utilities';
import type {
	ButtonInteraction,
	CommandInteraction,
	CommandInteractionOptionResolver,
	ContextMenuInteraction,
	DMChannel,
	Guild,
	GuildBasedChannel,
	GuildMember,
	Message,
	Role,
	TextChannel
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
	client: RadonClient<true>;
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

export interface RadonButtonInteraction extends ButtonInteraction {
	readonly message: Message;
	client: RadonClient<true>;
}
