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

export const Owners = ['697795666373640213'];

export const Prefixes = process.env.NODE_ENV === 'development' ? ['$', ''] : ['$', '.'];

export const RadonGuildId = ['944833697251721246'];

export const GuildIds = process.env.NODE_ENV === 'development' ? ['944833697251721246', '953175228899553312'] : [];
