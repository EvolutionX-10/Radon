import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { card, divider, text, accents } from '../presentation/components.js';
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

export function rewardContainer(until: number, checks: VoteCheck[] = []) {
	const blocks = rewardSummary(until, checks).split('\n\n');
	const panel = card('Your Supporter Pass', blocks[1], until > Date.now() ? accents.success : accents.primary);
	divider(panel);
	text(
		panel,
		'### Choose what works for you\n**Free** · Five saved accounts per game, normal coupon claiming.\n**Supporter** · Ten saved accounts per game, optional personal coupon alerts for 24 hours.'
	);
	text(
		panel,
		'### Activate your pass\nVote on either site below, then press **Check my vote**. Both sites give the same perks; voting on both is optional.'
	);
	divider(panel);
	for (const block of blocks.slice(4, -1)) text(panel, block);
	panel.addActionRowComponents(rewardButtons());
	text(panel, '-# Voting is optional. For a walkthrough, open /guide topic:rewards.');
	return panel;
}
