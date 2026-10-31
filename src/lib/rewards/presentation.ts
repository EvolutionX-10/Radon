import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { VoteCheck } from './service.js';
import { LISTED_BOT_ID } from './service.js';

export function rewardButtons() {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Vote on Top.gg').setURL(`https://top.gg/bot/${LISTED_BOT_ID}/vote`),
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setLabel('Vote on Discord Bot List')
			.setURL('https://discordbotlist.com/bots/radon-1595/upvote'),
		new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Check my vote').setCustomId('rewards:check')
	);
}
export function rewardSummary(until: number, checks: VoteCheck[] = []) {
	const status =
		until > Date.now()
			? `Your Supporter Pass is active until <t:${Math.floor(until / 1_000)}:f>.`
			: 'You currently have the free account allowance.';
	return [
		'## Support Radon, unlock a little extra',
		status,
		'Vote on **either** supported site, then press **Check my vote**. A verified vote unlocks a **24-hour Supporter Pass**. Voting on both is optional; perks do not stack.',
		'**Free:** five saved accounts per game and normal coupon claiming.\n**Supporter:** ten saved accounts per game and optional coupon alerts from servers you choose.',
		'Use `/claim alerts enabled:True` in a server to opt in. Alerts cover coupons staff post there through Radon, not every code published online. Unsubscribe with `enabled:False`.',
		'When the pass ends, all accounts stay saved. The first five remain active; use `/claim solo` for a specific saved account. No accounts are deleted.',
		...checks.map(
			(check) =>
				`${check.provider === 'topgg' ? 'Top.gg' : 'Discord Bot List'}: ${
					check.status === 'verified'
						? 'vote verified — thank you!'
						: check.status === 'not_found'
							? 'no recent vote found; wait a minute after voting and check again.'
							: 'vote verification is temporarily unavailable. Your existing perks are unaffected.'
				}`
		),
		'Need help? Run `/guide`.'
	].join('\n\n');
}
