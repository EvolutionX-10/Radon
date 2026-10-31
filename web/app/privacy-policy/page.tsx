import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Privacy Policy',
	description: 'Privacy policy for the Radon Discord bot for moderation, game coupon claiming, and server utilities.'
};

const dataGroups = [
	{
		title: 'Guild and configuration data',
		body: 'Guild IDs, role IDs, channel IDs, and server configuration values used for moderation setup and command behavior.'
	},
	{
		title: 'Moderation records',
		body: 'Warning entries (including reason, moderator ID, severity, and expiration), plus related moderation action references used for server management.'
	},
	{
		title: 'Optional feature data',
		body: 'Game Member Codes and optional account names are saved per game for coupon claiming. Feature data also includes claim settings, nickname locks, and optional AI chat channel configuration.'
	}
];

const policySections = [
	{
		title: '1. Information we process',
		body: 'Radon processes data needed to provide moderation, game coupon claiming, optional vote rewards, and utility features in Discord servers where it is installed.'
	},
	{
		title: '2. How information is used',
		body: 'Data is used to execute moderation actions, keep server configuration state, and provide command results and related automation.'
	},
	{
		title: '3. Game coupons and optional voting perks',
		body: 'Member Codes and coupon codes are sent to the relevant game publisher to redeem rewards. Redemption records help prevent duplicate submissions. Optional vote verification uses your Discord user ID with Top.gg or Discord Bot List; pass expiry, per-server/game alert subscriptions, and delivery records support these perks. Account names and masked account lists are shown privately. You can remove saved accounts with /claim delete and disable alerts with /claim alerts enabled:False in the relevant server and game.'
	},
	{
		title: '4. AI chat mode',
		body: 'If AI chat mode is enabled by server admins, channel-level AI settings are stored. Message content can be processed to generate replies in that channel.'
	},
	{
		title: '5. Data retention',
		body: 'Data is retained for operational needs, including moderation, duplicate-redemption prevention, and alert deduplication. Saved game accounts remain stored after a Supporter Pass expires until you remove them; turning off alerts disables the subscription. Removing an account or subscription does not necessarily remove operational redemption or delivery records.'
	},
	{
		title: '6. Data sharing',
		body: 'Radon does not sell personal data. Data is only processed as required for bot operation and integrated services.'
	},
	{
		title: '7. Security',
		body: 'Reasonable technical safeguards are applied, but no platform can guarantee absolute security or uninterrupted availability.'
	},
	{
		title: '8. Policy updates',
		body: 'This policy may change as the bot evolves. Continued use after updates means acceptance of the latest version.'
	}
];

export default function PrivacyPolicyPage() {
	return (
		<article className="container legal-page">
			<header className="document-heading">
				<Link href="/" className="text-link">
					← Back to Radon
				</Link>
				<p className="eyebrow">THE GOOD-TO-KNOW STUFF</p>
				<h1>Privacy Policy</h1>
				<p>This policy explains what data Radon processes and why. Effective date: October 31, 2026.</p>
			</header>
			<div className="data-groups">
				{dataGroups.map((group) => (
					<section key={group.title} className="document-section">
						<h2>{group.title}</h2>
						<p>{group.body}</p>
					</section>
				))}
			</div>

			<div className="document-sections">
				{policySections.map((section) => (
					<section key={section.title} className="document-section">
						<h2>{section.title}</h2>
						<p>{section.body}</p>
					</section>
				))}
			</div>

			<p className="document-footer">
				For usage rules, see the{' '}
				<Link href="/terms-of-service" className="underline underline-offset-4">
					Terms of Service
				</Link>
				.
			</p>
		</article>
	);
}
