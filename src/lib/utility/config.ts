process.env.NODE_ENV ??= 'development';

import { Owners } from '#constants';
import { envParseBoolean, envParseInteger, envParseString } from '#lib/env';
import type { BotList } from '@devtomio/plugin-botlist';
import { Time } from '@sapphire/duration';
import { BucketScope, type ClientLoggerOptions, type CooldownOptions, LogLevel } from '@sapphire/framework';
import type { ScheduledTaskHandlerOptions } from '@sapphire/plugin-scheduled-tasks';
import '@sapphire/plugin-scheduled-tasks/register';
import type { RedisOptions } from 'bullmq';
import {
	type ClientOptions,
	GatewayIntentBits,
	type MessageMentionOptions,
	Partials,
	type PresenceData,
	type SweeperOptions,
	ActivityType
} from 'discord.js';
import { config as dotenv } from 'dotenv-cra';

dotenv({
	debug: process.env.DOTENV_DEBUG_ENABLED ? envParseBoolean('DOTENV_DEBUG_ENABLED') : undefined
});

export function parseRedisOption(): Pick<RedisOptions, 'port' | 'password' | 'host'> {
	return {
		port: envParseInteger('REDIS_PORT'),
		password: envParseString('REDIS_PASSWORD'),
		host: envParseString('REDIS_HOST')
	};
}

export const config: Config = {
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMembers
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
	partials: [Partials.GuildMember, Partials.Message, Partials.User, Partials.Channel],
	logger: {
		level: LogLevel.Info
	},
	botlist: {
		keys: {
			topGG: envParseString('TOP_BOT_TOKEN'),
			voidBots: envParseString('VOID_BOT_TOKEN')
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
		status: 'online',
		activities: [
			{
				name: 'for Rule Breakers',
				type: ActivityType.Watching
			}
		]
	},
	tasks: {
		bull: { connection: { ...parseRedisOption(), maxRetriesPerRequest: null } }
	}
};

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
	presence: config.presence,
	tasks: config.tasks
};

interface Config {
	intents: GatewayIntentBits[];
	cooldown_options: CooldownOptions;
	mentions: MessageMentionOptions;
	partials: Partials[];
	logger: ClientLoggerOptions;
	sweepers: SweeperOptions;
	botlist: BotList.Options;
	presence: PresenceData;
	tasks: ScheduledTaskHandlerOptions;
}
