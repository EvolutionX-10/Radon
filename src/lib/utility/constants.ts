process.env.NODE_ENV ??= 'development';

export const enum Emojis {
	Cross = '<:redCross:957909502911471636>',
	Confirm = '<:greenTick:957909436477878302>',
	Left = '<:arrow_lilleft:959362275171508234>',
	Right = '<:arrow_lilright:959363096781148160>',
	Backward = '<:arrow_left_r:959362559595655179>',
	Forward = '<:arrow_right_r:959361662064930827>',
	Stop = '<:radon_stop:959386465807265794>'
}

export const enum Color {
	Admin = 0xbaeb34,
	Core = 0xff8700,
	Games = 0xdfc9de,
	General = 0x0033ff,
	Music = 0x7289da,
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

export const GuildIds = process.env.NODE_ENV === 'development' ? ['944833697251721246', '953175228899553312'] : [];
