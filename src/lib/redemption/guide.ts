import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const guideTopics = ['start', 'games', 'rewards', 'problems', 'staff'] as const;
export type GuideTopic = (typeof guideTopics)[number];
export function guideContent(topic: GuideTopic = 'start') {
	const pages: Record<GuideTopic, string> = {
		start: [
			'## Claim your first coupon',
			'**Already using Solo Leveling? Nothing to relearn.** Existing accounts and old CLAIM buttons work as before. Solo Leveling: ARISE is the default whenever you omit `game`.',
			'**From a coupon post:** press **CLAIM**. If you have saved accounts, that is all. First time? Paste your Member Code into the form and submit; Radon saves it and claims this coupon.',
			'**From a command:** open the game’s Settings → Account and copy its Member Code. Run `/claim set member_code:YOUR_CODE name:Main` once. Then use `/claim code coupon_code:CODE` for future coupons.',
			'Use `/claim view` to see masked accounts privately, `/claim set` with the same code to rename one, or `/claim delete` to remove one. `/claim solo member_code:YOUR_CODE coupon_code:CODE` claims for just one account without requiring it to be saved.',
			'Redemption results are private. Successful rewards go to your in-game mailbox. Voting is optional; five saved accounts per game are free.'
		].join('\n\n'),
		games: [
			'## More games, the same commands',
			'**Solo Leveling: ARISE** remains the default. Leave `game` empty for your usual workflow.',
			'**Seven Knights Re:BIRTH:** add `game:Seven Knights Re:BIRTH` to `/claim set`, `/claim code`, `/claim solo`, `/claim view`, or `/claim delete`.',
			'**The Seven Deadly Sins: Idle Adventure:** choose that game in the same optional field. Ten consecutive invalid codes can lock coupon entry for an hour, so only use trusted published codes.',
			'Accounts are separate for each game. A posted CLAIM button already knows its game; there is no game-selection screen or extra confirmation. Never enter a password or sign-in token — only the game’s Member Code.'
		].join('\n\n'),
		rewards: [
			'## Optional vote rewards',
			'Run `/vote`, vote on **either Top.gg or Discord Bot List**, then press **Check my vote**. Verification may take a minute. Both sites grant the same Supporter Pass; you never need both.',
			'**Supporter Pass:** ten saved accounts per game and optional personal coupon alerts for 24 hours. Rechecking the same vote does not keep extending your pass. There are no streak penalties or required votes.',
			'**Alerts:** run `/claim alerts enabled:True` in a server, with an optional `game`. Alerts cover future coupons staff post through Radon in that server. Allow direct messages. Turn them off with `enabled:False` in that server.',
			'**After expiry:** alerts pause, accounts stay saved, and the first five work in batch claims. `/claim solo` still lets you claim for a specific account. Extra slots reactivate with a new pass. All normal claims remain free.'
		].join('\n\n'),
		problems: [
			'## If something looks wrong',
			'**Wrong account or game:** check `/claim view` and the optional `game`. Copy your Member Code again from the correct game. Do not use your character name or password.',
			'**Already redeemed:** a confirmed successful redemption is remembered so repeated clicks do not send it again.',
			'**Unknown outcome or timeout:** check the in-game mailbox first. Radon holds uncertain requests instead of sending a second redemption that might duplicate an action. Network and publisher delays can take longer than normal.',
			'**Busy or rate limited:** wait and try later. Voting does not bypass game-service limits. Expired coupons cannot be restored by Radon.',
			'**No alert:** check your pass with `/vote`, opt in for the right game in the right server, and allow DMs. Alerts are not sent retroactively; closed DMs are not retried.',
			'**Vote not found:** wait a minute, use the same Discord account, and check again. If a voting service is unavailable, existing perks stay active and normal claiming continues.'
		].join('\n\n'),
		staff: [
			'## Posting coupons',
			'Your existing `/claim post code:CODE` still posts a Solo Leveling coupon with one CLAIM button. For another game, choose the optional `game` field. Users do not have to choose the game again.',
			'You need Manage Messages or the server’s configured posting role. `/claim policy` requires Manage Server and controls posting roles and channels.',
			'Choose `channel` if needed. Set `expires_in` to the number of minutes until the publisher’s actual coupon expiry; expired buttons stop accepting claims.',
			'Users who opted in to this game in this server and have an active Supporter Pass can receive a personal alert. Only post trusted published codes. A repeated code will not repeatedly notify the same person.',
			'No migration or re-saving is needed for existing Solo Leveling accounts. Old coupon messages keep their original meaning.'
		].join('\n\n')
	};
	return pages[topic];
}
export function guideButtons() {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		...guideTopics.map((topic, index) =>
			new ButtonBuilder()
				.setCustomId(`guide:${topic}`)
				.setStyle(ButtonStyle.Secondary)
				.setLabel(['Getting started', 'Games', 'Vote rewards', 'Troubleshooting', 'Posting coupons'][index])
		)
	);
}
