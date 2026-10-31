// Public website content only. Keep bot runtime imports and credentials out of web/.
export const site = {
	url: 'https://radon-lake-phi.vercel.app',
	invite: 'https://discord.com/api/oauth2/authorize?client_id=944833303226236989&scope=applications.commands+bot&permissions=543276137727',
	github: 'https://github.com/EvolutionX-10/Radon',
	topgg: 'https://top.gg/bot/944833303226236989/vote',
	dbl: 'https://discordbotlist.com/bots/radon-1595/upvote'
};

export const games = [
	{
		id: 'sololv',
		name: 'Solo Leveling: ARISE',
		short: 'Solo Leveling',
		subtitle: 'ARISE',
		theme: 'hunter',
		label: 'THE NEXT LEVEL AWAITS',
		description: 'More time in the dungeon. Less time entering codes.',
		command: '/claim set member_code:YOUR_CODE'
	},
	{
		id: 'tskgb',
		name: 'Seven Knights Re:BIRTH',
		short: 'Seven Knights',
		subtitle: 'Re:BIRTH',
		theme: 'knight',
		label: 'YOUR NEXT CHAPTER',
		description: 'Keep your adventure moving, one reward at a time.',
		command: '/claim set member_code:YOUR_CODE game:Seven Knights Re:BIRTH'
	},
	{
		id: 'nanarise',
		name: 'The Seven Deadly Sins: Idle Adventure',
		short: 'The Seven Deadly Sins',
		subtitle: 'IDLE ADVENTURE',
		theme: 'adventure',
		label: 'SMALL EFFORT. BIG ADVENTURE.',
		description: 'A little less busywork for your idle adventure.',
		command: '/claim set member_code:YOUR_CODE game:The Seven Deadly Sins: Idle Adventure'
	}
] as const;

export const commands = [
	{
		name: '/claim set',
		category: 'Games',
		description: 'Save a game account once. Add an optional name and game.',
		example: '/claim set member_code:YOUR_CODE name:Main'
	},
	{
		name: '/claim code',
		category: 'Games',
		description: 'Redeem a coupon across your saved accounts for a game.',
		example: '/claim code coupon_code:CODE'
	},
	{ name: '/claim view', category: 'Games', description: 'View your saved accounts privately, with masked codes.', example: '/claim view' },
	{
		name: '/claim solo',
		category: 'Games',
		description: 'Redeem for one account without saving it first.',
		example: '/claim solo member_code:YOUR_CODE coupon_code:CODE'
	},
	{
		name: '/claim delete',
		category: 'Games',
		description: 'Remove a saved account. Choose its name in autocomplete.',
		example: '/claim delete member_code:YOUR_CODE'
	},
	{
		name: '/claim alerts',
		category: 'Games',
		description: 'Opt in to future staff-posted coupon DMs. Delivery requires an active Supporter Pass.',
		example: '/claim alerts enabled:True'
	},
	{
		name: '/claim post',
		category: 'Games',
		description: 'Staff can publish a coupon with a ready-to-use CLAIM button.',
		example: '/claim post code:CODE'
	},
	{
		name: '/warn add',
		category: 'Moderation',
		description: 'Record a warning with a reason and configurable severity.',
		example: '/warn add target:@member reason:Server rules'
	},
	{
		name: '/timeout',
		category: 'Moderation',
		description: 'Temporarily mute a member for a specified duration.',
		example: '/timeout target:@member duration:10m reason:Server rules'
	},
	{
		name: '/ban',
		category: 'Moderation',
		description: 'Remove and ban a member with a recorded reason.',
		example: '/ban target:@member reason:Server rules'
	},
	{
		name: '/guide',
		category: 'Getting started',
		description: 'Open the private player guide for games, rewards, and troubleshooting.',
		example: '/guide'
	},
	{
		name: '/help',
		category: 'Getting started',
		description: 'Browse the live commands available to you in your server and channel.',
		example: '/help'
	},
	{ name: '/vote', category: 'Getting started', description: 'View optional voting perks, verify a vote, and check pass expiry.', example: '/vote' }
] as const;

export const faqs = [
	{
		question: 'Is Radon free to use?',
		answer: 'Yes. Normal coupon claiming and five saved accounts per game are free. You do not have to vote before claiming. An optional verified vote unlocks a 24-hour Supporter Pass with ten saved accounts per game and opt-in coupon alerts.'
	},
	{
		question: 'How do I claim my first coupon?',
		answer: 'Copy your Member Code from the game’s Settings → Account, then press CLAIM on a coupon post in Discord. Paste the code into the first-time form. Radon saves the account and submits the coupon; later CLAIM buttons use your saved accounts immediately. You can also use /claim set and /claim code.'
	},
	{
		question: 'Do my existing Solo Leveling accounts still work?',
		answer: 'Yes. Your saved accounts, account names, commands, and existing CLAIM buttons keep working. Solo Leveling: ARISE is the default game. Add the optional game field for Seven Knights Re:BIRTH or The Seven Deadly Sins: Idle Adventure. Each game has its own saved accounts.'
	},
	{
		question: 'What happens when my Supporter Pass expires?',
		answer: 'All your accounts stay saved. Batch claims use the first five in saved order, and /claim solo lets you redeem for a specific account. A new pass makes all ten available again. Alert delivery pauses until you have an active pass.'
	},
	{
		question: 'Where do coupon alerts come from?',
		answer: 'Alerts cover future coupons posted by staff with /claim post in a server and game you follow. They require an active Supporter Pass, open DMs, and access to the original channel. They do not search the internet or automatically redeem rewards. Use /claim alerts enabled:False in the same server and game to unsubscribe.'
	},
	{
		question: 'Can Radon guarantee every coupon will work?',
		answer: 'Coupon validity and rewards are controlled by the game publisher. Expired, region-limited, or previously used codes may fail. Check your in-game mailbox before retrying an uncertain result. For Idle Adventure, ten consecutive invalid entries can lock coupon entry for one hour. Use /guide for troubleshooting.'
	},
	{
		question: 'How do I set up moderation?',
		answer: 'Add Radon to your server, review the requested permissions, and position its role above the roles it needs to moderate. Run /help in the server to see the commands available to your role and channel. Server staff remain in control of moderation permissions and configuration.'
	}
];
