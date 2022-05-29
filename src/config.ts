process.env.NODE_ENV ??= 'development'; // TODO see if this is loaded first

import { BitFieldResolvable, ClientOptions, IntentsString, MessageMentionOptions, PartialTypes, Intents, SweeperOptions } from 'discord.js';
import { BucketScope, ClientLoggerOptions, CooldownOptions, LogLevel } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { vars } from '#vars';
import type { BotList } from '@devtomio/plugin-botlist';
import type { HMROptions } from '@sapphire/plugin-hmr';
import type { StatcordOptions } from '@kaname-png/plugin-statcord/dist/lib/types';

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
		parse: ['users'],
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
	hmr: {
		enabled: process.env.NODE_ENV === 'development',
		silent: true
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
	},
	statcord: {
		client_id: '944833303226236989',
		key: process.env.STATCORD_TOKEN!,
		autopost: process.env.NODE_ENV === 'production',
		debug: process.env.NODE_ENV === 'development',
		sharding: false
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
	hmr: HMROptions;
	statcord: StatcordOptions;
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
	hmr: config.hmr,
	shards: 'auto',
	disableMentionPrefix: process.env.NODE_ENV === 'production',
	preventFailedToFetchLogForGuildIds: ['733135938347073576', '979342238951800882'],
	botList: config.botlist,
	sweepers: config.sweepers,
	statcord: config.statcord
};
