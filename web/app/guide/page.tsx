import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { games, site } from '@/lib/site';

export const metadata: Metadata = {
	title: 'Getting started',
	description: 'Your Radon player guide: add the Discord bot, save game accounts, claim coupons, and understand optional Supporter Pass perks.'
};

export default function GuidePage() {
	return (
		<div className="container guide-page">
			<header className="document-heading">
				<Link href="/" className="text-link">
					<ArrowLeft size={14} />
					Back to the good stuff
				</Link>
				<p className="eyebrow">A LITTLE HELP GETTING STARTED</p>
				<h1>
					Your next move,
					<br />
					<span className="lavender-text">made simple.</span>
				</h1>
				<p>From adding Radon to claiming your first reward. Everything happens in Discord, right where your community already is.</p>
			</header>
			<div className="guide-layout">
				<nav className="guide-nav" aria-label="On this page">
					<span>IN THIS GUIDE</span>
					<a href="#add-radon">Add Radon</a>
					<a href="#first-claim">Your first claim</a>
					<a href="#choose-game">Choose a game</a>
					<a href="#accounts">Your accounts</a>
					<a href="#supporter">Supporter Pass</a>
					<a href="#alerts">Coupon alerts</a>
					<a href="#staff">For server staff</a>
					<a href="#troubleshooting">Troubleshooting</a>
				</nav>
				<div className="guide-content">
					<section className="document-section" id="add-radon">
						<h2>First, bring Radon along.</h2>
						<ol>
							<li>Use Add to Discord, sign in to Discord, and choose a server you have permission to manage.</li>
							<li>
								Review the permissions before authorizing. For moderation, Radon’s role must sit above the roles it needs to manage.
							</li>
							<li>
								Run <code>/help</code> to browse commands available in your server and channel. Run <code>/guide</code> for a private,
								interactive player guide.
							</li>
						</ol>
						<div className="mt-6">
							<Button asChild className="button-primary">
								<a href={site.invite} target="_blank" rel="noopener noreferrer">
									Add to Discord
									<ArrowUpRight />
								</a>
							</Button>
						</div>
					</section>
					<section className="document-section" id="first-claim">
						<h2>Your first reward is a few steps away.</h2>
						<ol>
							<li>
								Open your game’s Settings → Account and copy your <strong>Member Code</strong>. This identifies your game account; it
								is not your password.
							</li>
							<li>
								Press <strong>CLAIM</strong> on a staff-posted coupon in Discord. The first-time form asks for your Member Code, saves
								the account, and submits that coupon.
							</li>
							<li>
								For later coupons, press CLAIM once. Radon uses your saved accounts immediately and shows results privately.
								Successful rewards arrive in your game’s mailbox.
							</li>
						</ol>
						<p>Prefer commands? Save an account once, then claim:</p>
						<pre>
							<code>{'/claim set member_code:YOUR_CODE name:Main\n/claim code coupon_code:CODE'}</code>
						</pre>
						<div className="guide-callout">
							<ShieldCheck size={18} />
							<p>
								Claiming and five saved accounts per game are free. No vote, game picker, or extra confirmation stands between a saved
								account and its CLAIM button.
							</p>
						</div>
					</section>
					<section className="document-section" id="choose-game">
						<h2>Pick your world.</h2>
						<p>
							Solo Leveling: ARISE is the default. For another game, add the optional <code>game</code> field; Discord shows the full
							game names as choices. A posted CLAIM button already knows which game to use.
						</p>
						{games.map((game) => (
							<div key={game.id} id={game.id} className="guide-game">
								<h3>{game.name}</h3>
								<p>{game.description} Accounts and account names are stored separately for this game.</p>
								<pre>
									<code>{game.command}</code>
								</pre>
								{game.id === 'sololv' && (
									<p>
										Already using Solo Leveling? Your existing saved accounts, names, commands, and CLAIM buttons keep working. No
										migration needed.
									</p>
								)}
								{game.id === 'nanarise' && (
									<div className="guide-callout">
										<Info size={18} />
										<p>
											Ten consecutive invalid coupon entries can lock entry for one hour in Idle Adventure. Use trusted
											published codes and check the game before submitting.
										</p>
									</div>
								)}
							</div>
						))}
					</section>
					<section className="document-section" id="accounts">
						<h2>Your accounts, on your terms.</h2>
						<p>
							Use an optional name like Main or Alt to keep things clear. Saving the same Member Code again updates its name without
							making a duplicate.
						</p>
						<ul>
							<li>
								<code>/claim view</code> shows masked saved accounts privately.
							</li>
							<li>
								<code>/claim delete member_code:YOUR_CODE</code> removes an account. Saved names appear in autocomplete.
							</li>
							<li>
								<code>/claim solo member_code:YOUR_CODE coupon_code:CODE</code> redeems for one account without saving it first.
							</li>
						</ul>
						<p>
							Add the optional <code>game</code> field to any of these commands for another supported game. Never share passwords or
							sign-in tokens with Radon.
						</p>
					</section>
					<section className="document-section" id="supporter">
						<h2>A little support. A few extra perks.</h2>
						<p>
							A verified vote on{' '}
							<a href={site.topgg} target="_blank" rel="noopener noreferrer">
								Top.gg
							</a>{' '}
							or{' '}
							<a href={site.dbl} target="_blank" rel="noopener noreferrer">
								Discord Bot List
							</a>{' '}
							unlocks a <strong>24-hour Supporter Pass</strong>: ten saved accounts per game and optional personal coupon alerts.
						</p>
						<ol>
							<li>
								Run <code>/vote</code> in Discord.
							</li>
							<li>Vote on either listing using the same Discord account.</li>
							<li>
								Press <strong>Check my vote</strong>. Verification can take a minute; wait at least 30 seconds between checks.
							</li>
						</ol>
						<p>
							Voting on both sites does not stack durations. Rechecking the same vote does not extend its reward. With timestamped
							votes, expiry is 24 hours after the vote; the older Top.gg API starts the pass at first verification. Your exact expiry
							appears in <code>/vote</code>.
						</p>
						<h3>When the pass ends</h3>
						<p>
							Your accounts stay saved. Batch claims use the first five in saved order, and <code>/claim solo</code> still works for a
							specific account. A new pass unlocks all ten again. Alert delivery pauses until a pass is active.
						</p>
						<p>
							Verification depends on the listing provider being available and configured. A listing link alone does not mean your vote
							has been verified. Basic claiming remains available during verification outages.
						</p>
					</section>
					<section className="document-section" id="alerts">
						<h2>A heads-up, when you want one.</h2>
						<p>Follow future staff-posted coupons for a game in your server:</p>
						<pre>
							<code>{'/claim alerts enabled:True\n/claim alerts enabled:False'}</code>
						</pre>
						<p>
							Add the optional <code>game</code> field for another game. You can subscribe before you have a pass, but delivery requires
							an active Supporter Pass. Allow DMs from the server and keep access to the original coupon channel.
						</p>
						<p>
							Alerts cover future posts created by staff with <code>/claim post</code>. They do not scrape the internet, automatically
							claim rewards, or send older posts when you join or renew. The same game/coupon is sent at most once to you across
							servers. Leaving the server or losing channel access prevents delivery; closed DMs and uncertain sends are not retried.
						</p>
						<p>To stop alerts, disable them in the same server for the same game.</p>
					</section>
					<section className="document-section" id="staff">
						<h2>For the people keeping things running.</h2>
						<h3>Post a coupon</h3>
						<pre>
							<code>/claim post code:CODE</code>
						</pre>
						<p>
							Posting needs Manage Messages or the configured posting role. Choose the optional <code>game</code>, <code>channel</code>,
							and <code>expires_in</code> (minutes) fields when needed. Only use the publisher’s announced expiry.
						</p>
						<p>
							Staff with Manage Server can use <code>/claim policy</code> to set a posting role or destination channel. Personal coupon
							alerts respect the recipient’s current access to that channel.
						</p>
						<h3>Make moderation your own</h3>
						<p>
							Use <code>/help</code> for the commands available to your role and channel. Radon includes warnings, configurable warning
							actions, timeouts, bans, and moderation records. Discord permissions, configured staff roles, and role hierarchy still
							apply.
						</p>
					</section>
					<section className="document-section" id="troubleshooting">
						<h2>A little stuck?</h2>
						<h3>A claim is taking longer</h3>
						<p>
							Radon shows a private progress status when processing takes longer. Publisher latency, throttling, and larger account
							batches can add time. A progress status is not a successful redemption.
						</p>
						<h3>The result is uncertain</h3>
						<p>
							Check your in-game mailbox before retrying. Radon avoids automatically retrying redemption requests with an unknown
							outcome and remembers confirmed successes.
						</p>
						<h3>A coupon failed</h3>
						<p>
							Confirm the game and code. Publishers control expiry, regional restrictions, and whether an account has already used a
							coupon. Voting does not override these limits or restore expired codes.
						</p>
						<h3>A command or alert is missing</h3>
						<p>
							Check server permissions and your access to the channel. For alerts, check your active pass, subscription game/server, and
							DM settings. Run <code>/guide</code> or <code>/help</code> in Discord for the current options.
						</p>
						<p>
							Found a bug?{' '}
							<a href={`${site.github}/issues`} target="_blank" rel="noopener noreferrer">
								Open an issue on GitHub
							</a>
							. Keep Member Codes and other personal data out of public reports.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
