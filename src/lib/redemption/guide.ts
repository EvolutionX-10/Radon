import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { card, divider, text } from '../presentation/components.js';

export const guideTopics = ['start', 'games', 'rewards', 'problems', 'staff', 'cases', 'automod'] as const;
export type GuideTopic = (typeof guideTopics)[number];
const labels = ['Getting started', 'Games', 'Vote rewards', 'Troubleshooting', 'Posting coupons', 'Moderation cases', 'AutoMod'];
const pages: Record<GuideTopic, { title: string; intro: string; sections: [string, string][]; tip: string }> = {
	start: {
		title: 'Your first coupon, in three steps',
		intro: 'Save your Member Code once. Claim future coupons with a click.',
		sections: [
			[
				'01 · Find your Member Code',
				'Open your game’s **Settings → Account** and copy your Member Code. Never enter a password or sign-in token.'
			],
			[
				'02 · Save an account',
				'`/claim set member_code:YOUR_CODE name:Main`\nSolo Leveling: ARISE is the default. For another game, select the optional `game` field.'
			],
			[
				'03 · Claim your rewards',
				'Press **CLAIM** on a coupon post, or run `/claim code coupon_code:CODE`. On your first button claim, the form saves your code and claims that coupon. Confirmed rewards go to your in-game mailbox.'
			],
			[
				'Manage your accounts',
				'`/claim view` shows masked accounts privately. Use `/claim set` with the same code to rename one, `/claim delete` to remove one, or `/claim solo` to claim for one account without saving it.'
			]
		],
		tip: 'Five saved accounts per game are free. Existing Solo Leveling accounts and old CLAIM buttons keep working. Results are private.'
	},
	games: {
		title: 'One workflow. Three games.',
		intro: 'The optional `game` field chooses which game’s accounts and coupons to use.',
		sections: [
			['Solo Leveling: ARISE', 'Your default game. Leave `game` empty to use your existing accounts.'],
			[
				'Seven Knights Re:BIRTH',
				'Choose **Seven Knights Re:BIRTH** in `/claim set`, `/claim code`, `/claim solo`, `/claim view`, or `/claim delete`.'
			],
			[
				'The Seven Deadly Sins: Idle Adventure',
				'Choose this game in the same field. **Ten consecutive invalid codes can lock coupon entry for an hour.** Use trusted published coupons.'
			]
		],
		tip: 'Accounts are separate for each game. Posted CLAIM buttons already select the correct game.'
	},
	rewards: {
		title: 'A little extra for supporting Radon',
		intro: 'Voting is optional. Normal coupon claiming stays free.',
		sections: [
			[
				'Get a 24-hour Supporter Pass',
				'Run `/vote`, vote on **either Top.gg or Discord Bot List**, then press **Check my vote**. Allow a minute for verification. Both sites give the same pass; perks do not stack.'
			],
			[
				'What you unlock',
				'**Ten saved accounts per game** and optional personal coupon alerts. Rechecking the same vote does not extend the pass.'
			],
			[
				'Choose your alerts',
				'In a server, run `/claim alerts enabled:True` and optionally choose `game`. Allow DMs. Use `enabled:False` in that server to unsubscribe. Alerts cover future coupons staff post there through Radon.'
			],
			[
				'When your pass expires',
				'Accounts stay saved. The first five work in batch claims; `/claim solo` still works for a specific account. Alerts pause. A new pass reactivates the extra slots.'
			]
		],
		tip: 'There are no required votes or streak penalties. Check your current pass with /vote.'
	},
	problems: {
		title: 'Get back to claiming',
		intro: 'Choose the symptom below for the next step.',
		sections: [
			[
				'Wrong account or game',
				'Check `/claim view` and the optional `game`. Copy the Member Code again from the correct game’s account settings.'
			],
			[
				'Invalid or expired coupon',
				'Check the code and its game against the publisher’s post. A failed preview may also mean the game service is unavailable. Radon cannot restore expired coupons.'
			],
			[
				'Already redeemed, unknown, or slow',
				'Confirmed successes are remembered. For timeouts or unknown outcomes, **check your in-game mailbox first**. Radon holds uncertain requests to avoid duplicate submissions. If busy or rate limited, wait and try later.'
			],
			[
				'Missing vote or alert',
				'Wait a minute and check `/vote` with the same Discord account. For alerts, check your pass, server, game, opt-in, and DMs. Alerts are not retroactive; closed DMs are not retried.'
			]
		],
		tip: 'Voting does not bypass publisher limits. A voting-service outage leaves existing perks and free claiming available.'
	},
	staff: {
		title: 'Post a coupon people can use',
		intro: 'One post, one CLAIM button, the correct game already selected.',
		sections: [
			[
				'01 · Choose the code and game',
				'`/claim post code:CODE` posts a Solo Leveling coupon. Select the optional `game` for another title. Post only trusted published codes.'
			],
			[
				'02 · Choose where and when',
				'Use `channel` for a different destination. Set `expires_in` to the minutes until the publisher’s actual expiry; expired buttons stop accepting claims.'
			],
			[
				'03 · Know who can post',
				'You need **Manage Messages** or the configured posting role. `/claim policy` requires **Manage Server** and controls posting roles and channels.'
			],
			[
				'Personal notifications',
				'Members with an active Supporter Pass who opted in to this game in this server can receive an alert. Reposting the same code does not repeatedly notify the same person.'
			]
		],
		tip: 'Existing Solo Leveling accounts and older coupon posts need no migration.'
	},
	cases: {
		title: 'Understand a moderation case',
		intro: 'A case is the saved record of a moderation action. The mod log is its Discord message.',
		sections: [
			[
				'Find the right reference',
				'**Case reference** is the full ID used by `/case` commands. It appears below the log, away from the title. **Discord message ID** is available through Discord’s Copy Message ID; it identifies only the log message and is no longer repeated on new logs. **Report reference** identifies the submitted report; a timeout creates a separate moderation case.'
			],
			[
				'Review the action',
				'`/case view id:CASE_REFERENCE` shows the action, member, moderator, reason, and recent audit entries.\n`/case history member:MEMBER` shows ten recent cases. Use the final case reference in `before` to view older cases.'
			],
			[
				'Notes and reasons',
				'`/case note id:CASE_REFERENCE text:NOTE` adds a private staff note.\n`/case reason id:CASE_REFERENCE text:REASON` updates the saved case and retains previous reasons. It does not rewrite the posted log.'
			],
			[
				'Edit a posted log',
				'**Edit Reason** on a mod log updates that message and its linked case; warning logs also update the stored warning. Use this button when you want the visible log and saved reason to match. Older logs keep working.'
			]
		],
		tip: 'Case views and notes are private to staff. Case references do not replace warning IDs used by /warn. A staff note is not a new moderation action.'
	},
	automod: {
		title: 'Start with observation',
		intro: 'See what a rule catches before you let it enforce.',
		sections: [
			[
				'01 · Choose a rule',
				'`/automod native` configures Discord keywords, mention spam, or generic spam. `/automod flood`, `/automod links`, and `/automod raid` configure Radon’s custom detection.'
			],
			[
				'02 · Observe in a staff channel',
				'Choose `mode:observe` and an `alert_channel`. Matches create alerts only. Review false positives and configure exemptions before choosing `mode:enforce`.'
			],
			[
				'03 · Understand enforcement',
				'Native rules block matching messages. Custom flood/link rules delete matches. Raid enforcement temporarily raises verification to **Highest**; existing role holders are unaffected. `mode:off` disables handling.'
			],
			[
				'Check or adjust',
				'`/automod status` shows rules, thresholds, exemptions, and available detection. Native rules use their own exemptions; `/automod exemptions` changes custom rules. Staff with **Manage Messages** are exempt from custom message rules. `/automod remove` deletes a native preset owned by Radon.'
			]
		],
		tip: 'Requires Manage Server. Custom message and join detection need the installation’s corresponding intent opt-in; status shows availability.'
	}
};

export function guideContent(topic: GuideTopic = 'start') {
	const page = pages[topic];
	return [`## ${page.title}`, page.intro, ...page.sections.map(([heading, body]) => `### ${heading}\n${body}`), page.tip].join('\n\n');
}
export function guideContainer(topic: GuideTopic = 'start') {
	const page = pages[topic];
	const panel = card(page.title, page.intro);
	text(panel, `-# RADON GUIDE · ${guideTopics.indexOf(topic) + 1} / ${guideTopics.length}`);
	divider(panel);
	for (const [heading, body] of page.sections) text(panel, `### ${heading}\n${body}`);
	divider(panel);
	text(panel, `-# ${page.tip}`);
	for (let start = 0; start < guideTopics.length; start += 5) {
		panel.addActionRowComponents((row) =>
			row.addComponents(
				...guideTopics.slice(start, start + 5).map((item, index) =>
					new ButtonBuilder()
						.setCustomId(`guide:${item}`)
						.setStyle(item === topic ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setLabel(labels[start + index])
				)
			)
		);
	}
	return panel;
}
