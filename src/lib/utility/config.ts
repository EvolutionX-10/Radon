process.env.NODE_ENV ??= 'development';

import {
	BitFieldResolvable,
	ClientOptions,
	IntentsString,
	MessageMentionOptions,
	PartialTypes,
	Intents,
	SweeperOptions,
	PresenceData
} from 'discord.js';
import { BucketScope, ClientLoggerOptions, CooldownOptions, LogLevel } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { Owners } from '#constants';
import type { BotList } from '@devtomio/plugin-botlist';
import { config as dotenv } from 'dotenv-cra';
import { envParseBoolean } from '#lib/env';

dotenv({
	debug: process.env.DOTENV_DEBUG_ENABLED ? envParseBoolean('DOTENV_DEBUG_ENABLED') : undefined
});

export const config: config = {
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_BANS,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.GUILD_MEMBERS
	],
	cooldown_options: {
		delay: Time.Second * 10,
		filteredUsers: Owners,
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
			interval: 30,
			filter: () => null
		},
		invites: {
			interval: 60,
			filter: () => null
		},
		messages: {
			interval: 120,
			lifetime: 360
		},
		reactions: {
			interval: 5,
			filter: () => null
		},
		voiceStates: {
			interval: 30,
			filter: () => null
		},
		threads: {
			interval: 3600,
			lifetime: 14400
		}
	},
	presence: {
		status: 'dnd',
		activities: [
			{
				name: 'for Rule Breakers',
				type: 'WATCHING'
			}
		]
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
	presence: PresenceData;
}
export const ClientConfig: ClientOptions = {
	intents: config.intents,
	allowedMentions: config.mentions,
	caseInsensitiveCommands: true,
	caseInsensitivePrefixes: true,
	defaultCooldown: config.cooldown_options,
	partials: config.partials,
	logger: config.logger,
	loadMessageCommandListeners: true,
	typing: false,
	shards: 'auto',
	disableMentionPrefix: process.env.NODE_ENV === 'production',
	preventFailedToFetchLogForGuilds: true,
	botList: config.botlist,
	sweepers: config.sweepers,
	presence: config.presence
};