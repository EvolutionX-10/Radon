process.env.NODE_ENV ??= 'development';

import type {
    BitFieldResolvable,
    ClientOptions,
    IntentsString,
    MessageMentionOptions,
    PartialTypes,
} from 'discord.js';
import {
    BucketScope,
    ClientLoggerOptions,
    CooldownOptions,
    LogLevel,
} from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { vars } from '#vars';

export const config: config = {
    intents: [
        'GUILDS',
        'GUILD_MEMBERS',
        'GUILD_MESSAGES',
        'GUILD_BANS',
        'DIRECT_MESSAGES',
    ],
    cooldown_options: {
        delay: Time.Second * 10,
        filteredUsers: vars.owners,
        scope: BucketScope.User,
    },
    mentions: {
        parse: ['everyone', 'roles', 'users'],
        repliedUser: false,
    },
    partials: ['GUILD_MEMBER', 'MESSAGE', 'USER', 'CHANNEL'],
    logger: {
        level:
            process.env.NODE_ENV === 'development'
                ? LogLevel.Debug
                : LogLevel.Info,
    },
};
interface config {
    intents: BitFieldResolvable<IntentsString, number>;
    cooldown_options: CooldownOptions;
    mentions: MessageMentionOptions;
    partials: PartialTypes[];
    logger: ClientLoggerOptions;
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
        silent: true,
    },
    shards: 'auto',
    disableMentionPrefix: process.env.NODE_ENV === 'production',
    preventFailedToFetchLogForGuildIds: ['733135938347073576'],
};
