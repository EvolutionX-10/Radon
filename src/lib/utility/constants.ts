import { Button, Row } from '#lib/structures';
import { ButtonBuilder, ButtonStyle, type UserFlagsString } from 'discord.js';

process.env.NODE_ENV ??= 'development';

export const enum Emojis {
	Cross = '<:redCross:957909502911471636>',
	Confirm = '<:greenTick:957909436477878302>',
	Left = '<:arrow_lilleft:959362275171508234>',
	Right = '<:arrow_lilright:959363096781148160>',
	Backward = '<:arrow_left_r:959362559595655179>',
	Forward = '<:arrow_right_r:959361662064930827>',
	Stop = '<:radon_stop:959386465807265794>',
	Owner = '<:owner:1026798797839409173>',
	TextChannel = '<:text:1027126127690514462>',
	CategoryChannel = '<:category:1027126168949895198>',
	VoiceChannel = '<:vc:1027126195067826196>',
	ThreadChannel = '<:thread:1027126259328749598>',
	Member = '<:member:1027127446006419506>',
	Bot = '<:bot:1027129061430013973>'
}

export const enum Color {
	Admin = 0xbaeb34,
	Core = 0xff8700,
	Games = 0xdfc9de,
	General = 0x0033ff,
	Invisible = 0x2f3136,
	Utility = 0x00ff00,
	Moderation = 0x00ffff,
	Owner = 0xffff00,
	System = 0xc9dfca
}

export enum Severity {
	ban = 0xf80404,
	kick = 0xfb9f06,
	timeout = 0xffcf06,
	softban = 0xfc7c09,
	warn = 0xfcfc7c,
	unban = 0x94ec94,
	warn_remove = 0x21fec0
}

export const enum WarnSeverity {
	One = '1 day',
	Two = '3 days',
	Three = '1 week',
	Four = '2 weeks',
	Five = '4 weeks'
}

export const Owners = ['697795666373640213'];

export const Prefixes = process.env.NODE_ENV === 'development' ? ['$', ''] : ['$', '.'];

export const RadonGuildId = ['944833697251721246'];

export const TestServerGuildIds = ['953175228899553312', '991194621763919971'];

export const UserFlags: Partial<Record<UserFlagsString, string>> = {
	VerifiedBot: '<:vbot:1026794095735226418>',
	BugHunterLevel1: '<:BadgeBugHunter:1024918366042996797>',
	BugHunterLevel2: '<:BadgeBugHunterLvl2:1024918372607082496>',
	CertifiedModerator: '<:BadgeCertifiedMod:1024918378621706250>',
	Staff: '<:BadgeStaff:1024918411832213525>',
	PremiumEarlySupporter: '<:BadgeEarlySupporter:1024918384682475570>',
	VerifiedDeveloper: '<:BadgeEarlyVerifiedBotDeveloper:1024918390273482793>',
	HypeSquadOnlineHouse1: '<:BadgeBalance:1024918349144145931>',
	HypeSquadOnlineHouse2: '<:BadgeBravery:1024918354726752267>',
	HypeSquadOnlineHouse3: '<:BadgeBrilliance:1024918361026613299>',
	Hypesquad: '<:BadgeHypeSquadEvents:1024918396040650764>',
	Partner: '<:BadgePartner:1024918407335919646>',
	ActiveDeveloper: '<:activedev:1434788503912321106>'
};

const vote_topgg = new Button() //
	._label('Vote on Top.gg')
	._style(ButtonStyle.Link)
	._emoji('<:topgg:918280202398875758>')
	._url('https://top.gg/bot/944833303226236989/vote');
const vote_void = new Button() //
	._label('Vote on Void Bots')
	._style(ButtonStyle.Link)
	._emoji('<:voidbots:742925293907607624>')
	._url('https://voidbots.net/bot/944833303226236989/vote');
// const vote_labs = new Button() //
// 	._label('Vote on Discord Labs')
// 	._style(ButtonStyle.Link)
// 	._emoji('<:discordlabsicon:621472531735642130>')
// 	._url('https://bots.discordlabs.org/bot/944833303226236989?vote');
const vote_dbl = new Button() //
	._label('Vote on Discord Bot List')
	._style(ButtonStyle.Link)
	._emoji('<:dbl:1037357030152863824>')
	._url('https://discordbotlist.com/bots/radon-1595/upvote');

export const voteRow = new Row<ButtonBuilder>()._components([vote_topgg, vote_void, vote_dbl]);

// export const RecommendedPermissions = 543276137727n;
// export const RecommendedPermissionsWithoutAdmin = 543276137719n;
export const RecommendedPermissions = 3126454834429183n;
export const RecommendedPermissionsWithoutAdmin = 3126454834429175n;
