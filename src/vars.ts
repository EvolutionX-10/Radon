export const vars = {
	emojis: {
		cross: '<:redCross:957909502911471636>',
		confirm: '<:greenTick:957909436477878302>',
		left: '<:arrow_lilleft:959362275171508234>',
		right: '<:arrow_lilright:959363096781148160>',
		full_left: '<:arrow_left_r:959362559595655179>',
		full_right: '<:arrow_right_r:959361662064930827>',
		stop: '<:radon_stop:959386465807265794>'
	},
	owners: ['697795666373640213'],
	owner_prefixes: process.env.NODE_ENV === 'development' ? ['$', ''] : ['$', '.'],
	guildIds: process.env.NODE_ENV === 'development' ? ['944833697251721246'] : []
};
