import type { PermissionsString } from 'discord.js';
/**
 * It takes an array of strings, splits each string by underscores, capitalizes the first letter of
 * each word, and joins them back together
 * @param {string[]} perm - The array of strings to format.
 * @param {boolean} key - Should it filter and return only key permissions? (default: true)
 * @returns {string[]} An array of strings.
 * @example
 * format(['SEND_MESSAGES']) -> ['Send Messages']
 */
export function format(perm: PermissionsString[], key?: boolean): string[];
/**
 * It takes a string of screaming snake case and returns pascal case
 * @param {string} perm The permission string
 * @returns {string} Formatted string
 * @example
 * format('SEND_MESSAGES') -> 'Send Messages'
 */
export function format(perm: string): string;

export function format(perm: PermissionsString[] | string, key = true) {
	if (Array.isArray(perm)) {
		return perm
			.sort((a, b) => order[b] - order[a])
			.map((e) =>
				e
					.split(``)
					.map((i) => (i.match(/[A-Z]/) ? ` ${i}` : i))
					.join(``)
					.trim()
			)
			.map((s) => {
				s = s.replace(/T T S/g, 'TTS');
				s = s.replace(/V A D/g, 'VAD');
				return s;
			})
			.filter((f) => (key ? f.match(/mem|mana|min|men/gim) : true));
	}
	return perm
		.split(``)
		.map((i) => (i.match(/[A-Z]/) ? ` ${i}` : i))
		.join(``)
		.trim()
		.replace(/T T S/g, 'TTS')
		.replace(/V A D/g, 'VAD');
}

const order: Record<PermissionsString, number> = {
	ViewChannel: 0,
	SendMessages: 1,
	EmbedLinks: 2,
	ReadMessageHistory: 3,
	Connect: 4,
	Speak: 5,
	UseEmbeddedActivities: 5,
	Stream: 5,
	UseSoundboard: 5,
	AttachFiles: 6,
	AddReactions: 7,
	CreateInstantInvite: 8,
	UseExternalEmojis: 9,
	UseExternalStickers: 9,
	PrioritySpeaker: 10,
	SendMessagesInThreads: 10,
	SendVoiceMessages: 10,
	SendTTSMessages: 10,
	SendPolls: 11,
	UseVAD: 11,
	UseExternalSounds: 11,
	UseExternalApps: 11,
	ChangeNickname: 12,
	UseApplicationCommands: 13,
	RequestToSpeak: 14,
	CreatePublicThreads: 15,
	CreatePrivateThreads: 16,
	ViewGuildInsights: 19,
	DeafenMembers: 20,
	ManageThreads: 20,
	MoveMembers: 20,
	MuteMembers: 20,
	CreateEvents: 20,
	CreateGuildExpressions: 20,
	ManageEmojisAndStickers: 21,
	ManageGuildExpressions: 21,
	ManageEvents: 21,
	BypassSlowmode: 22,
	PinMessages: 22,
	ManageMessages: 22,
	ManageWebhooks: 23,
	ManageNicknames: 24,
	ManageRoles: 25,
	ModerateMembers: 26,
	ViewAuditLog: 27,
	KickMembers: 28,
	BanMembers: 29,
	ManageChannels: 30,
	ManageGuild: 31,
	MentionEveryone: 32,
	ViewCreatorMonetizationAnalytics: 33,
	Administrator: 40
};
