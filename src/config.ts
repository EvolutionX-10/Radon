process.env.NODE_ENV ??= 'development'; // TODO see if this is loaded first

import { BitFieldResolvable, ClientOptions, IntentsString, MessageMentionOptions, PartialTypes, Intents, SweeperOptions } from 'discord.js';
import { BucketScope, ClientLoggerOptions, CooldownOptions, LogLevel } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { vars } from '#vars';
import type { BotList } from '@devtomio/plugin-botlist';

export const config: config = {
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_BANS,
		Intents.FLAGS.DIRECT_MESSAGES
	],
	cooldown_options: {
		delay: Time.Second * 10,
		filteredUsers: vars.owners,
		scope: BucketScope.User
	},
	mentions: {
		parse: ['everyone', 'roles', 'users'],
		repliedUser: false
	},
	partials: ['GUILD_MEMBER', 'MESSAGE', 'USER', 'CHANNEL'],
	logger: {
		level: process.env.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Info
	},
	botlist: {
		keys: {
			topGG: process.env.TOP_BOT_TOKEN,
			voidBots: process.env.VOID_BOT_TOKEN
		},
		clientId: '944833303226236989',
		autoPost: {
			enabled: process.env.NODE_ENV === 'production',
			interval: Time.Hour * 12
		}
	},
	sweepers: {
		bans: {
			interval: 300,
			filter: () => null
		},
		applicationCommands: {
			interval: 300,
			filter: () => null
		},
		emojis: {
			interval: 60,
			filter: () => null
		},
		invites: {
			interval: 120,
			filter: () => null
		},
		messages: {
			interval: 120,
			lifetime: 360
		},
		presences: {
			interval: 5,
			filter: () => null
		},
		reactions: {
			interval: 5,
			filter: () => null
		},
		voiceStates: {
			interval: 60,
			filter: () => null
		},
		threads: {
			interval: 3600,
			lifetime: 14400
		}
	}
};
interface config {
	intents: BitFieldResolvable<IntentsString, number>;
	cooldown_options: CooldownOptions;
	mentions: MessageMentionOptions;
	partials: PartialTypes[];
	logger: ClientLoggerOptions;
	sweepers: SweeperOptions;
	botlist: BotList.Options;
}
export const client_config: ClientOptions = {
	intents: config.intents,
	allowedMentions: config.mentions,
	caseInsensitiveCommands: true,
	caseInsensitivePrefixes: true,
	defaultCooldown: config.cooldown_options,
	partials: config.partials,
	logger: config.logger,
	loadMessageCommandListeners: true,
	typing: false,
	hmr: {
		enabled: process.env.NODE_ENV === 'development',
		silent: true
	},
	shards: 'auto',
	disableMentionPrefix: process.env.NODE_ENV === 'production',
	preventFailedToFetchLogForGuildIds: ['733135938347073576'],
	botList: config.botlist
};
