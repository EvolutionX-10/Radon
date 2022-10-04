import type { PermissionString } from 'discord.js';

/**
 * It takes an array of strings, splits each string by underscores, capitalizes the first letter of
 * each word, and joins them back together
 * @param {string[]} perm - The array of strings to format.
 * @param {boolean} key - Should it filter and return only key permissions? (default: true)
 * @returns {string[]} An array of strings.
 * @example
 * format(['SEND_MESSAGES']) -> ['Send Messages']
 */
export function format(perm: string[], key?: boolean): string[];
/**
 * It takes a string of screaming snake case and returns pascal case
 * @param {string} perm The permission string
 * @returns {string} Formatted string
 * @example
 * format('SEND_MESSAGES') -> 'Send Messages'
 */
export function format(perm: string): string;

export function format(perm: string[] | string, key = true) {
	if (Array.isArray(perm)) {
		return perm
			.sort((a, b) => order[b as PermissionString] - order[a as PermissionString])
			.map((e) =>
				e
					.split(`_`)
					.map((i) => (i.length > 1 ? i[0] + i.match(/\B(\w+)/)?.[1]?.toLowerCase() : i.toUpperCase()))
					.join(` `)
			)
			.map((s) => {
				s = s.replace('Tts', 'TTS');
				s = s.replace('Vad', 'VAD');
				return s;
			})
			.filter((f) => (key ? f.match(/mem|mana|min|men/gim) : true));
	}
	return perm
		.split(`_`)
		.map((i) => i[0] + i.match(/\B(\w+)/)?.[1]?.toLowerCase())
		.join(` `);
}

const order: Record<PermissionString, number> = {
	VIEW_CHANNEL: 0,
	SEND_MESSAGES: 1,
	EMBED_LINKS: 2,
	READ_MESSAGE_HISTORY: 3,
	CONNECT: 4,
	SPEAK: 5,
	START_EMBEDDED_ACTIVITIES: 5,
	STREAM: 5,
	ATTACH_FILES: 6,
	ADD_REACTIONS: 7,
	CREATE_INSTANT_INVITE: 8,
	USE_EXTERNAL_EMOJIS: 9,
	USE_EXTERNAL_STICKERS: 9,
	PRIORITY_SPEAKER: 10,
	SEND_MESSAGES_IN_THREADS: 10,
	SEND_TTS_MESSAGES: 10,
	USE_VAD: 11,
	CHANGE_NICKNAME: 12,
	USE_APPLICATION_COMMANDS: 13,
	REQUEST_TO_SPEAK: 14,
	USE_PUBLIC_THREADS: 15,
	USE_PRIVATE_THREADS: 16,
	CREATE_PUBLIC_THREADS: 17,
	CREATE_PRIVATE_THREADS: 18,
	VIEW_GUILD_INSIGHTS: 19,
	DEAFEN_MEMBERS: 20,
	MANAGE_THREADS: 20,
	MOVE_MEMBERS: 20,
	MUTE_MEMBERS: 20,
	MANAGE_EMOJIS_AND_STICKERS: 21,
	MANAGE_EVENTS: 21,
	MANAGE_MESSAGES: 22,
	MANAGE_WEBHOOKS: 23,
	MANAGE_NICKNAMES: 24,
	MANAGE_ROLES: 25,
	MODERATE_MEMBERS: 26,
	VIEW_AUDIT_LOG: 27,
	KICK_MEMBERS: 28,
	BAN_MEMBERS: 29,
	MANAGE_CHANNELS: 30,
	MANAGE_GUILD: 31,
	MENTION_EVERYONE: 32,
	ADMINISTRATOR: 40
};
