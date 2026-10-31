import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Terms of Service',
	description: 'Terms for using the Radon Discord bot for moderation, game coupon claiming, and server utilities.'
};

const sections = [
	{
		title: '1. Acceptance of terms',
		body: 'By inviting or using Radon, you agree to these Terms of Service. If you do not agree, do not use the bot.'
	},
	{
		title: '2. Intended use',
		body: 'Radon provides Discord moderation, server utilities, and game coupon claiming. Game publishers control coupon validity, rewards, and account restrictions. Optional voting perks require verification and do not guarantee redemption. You must use it in compliance with Discord rules and applicable law.'
	},
	{
		title: '3. Moderation responsibility',
		body: 'Server owners and staff are responsible for how moderation actions are configured and used. You are responsible for all actions executed through your server permissions.'
	},
	{
		title: '4. Availability and changes',
		body: 'Features may be updated, changed, or removed over time. Service uptime is provided on a best-effort basis and is not guaranteed.'
	},
	{
		title: '5. Prohibited use',
		body: 'You may not use Radon to harass users, automate abuse, bypass platform enforcement, or perform unlawful activity.'
	},
	{
		title: '6. Limitation of liability',
		body: 'Radon is provided as-is without warranties. The maintainers are not liable for direct or indirect damages resulting from use, misuse, outages, or configuration errors.'
	},
	{
		title: '7. Contact and updates',
		body: 'These terms can be revised when the bot changes. Continued use after updates means you accept the revised terms.'
	}
];

export default function TermsOfServicePage() {
	return (
		<article className="container legal-page">
			<header className="document-heading">
				<Link href="/" className="text-link">
					← Back to Radon
				</Link>
				<p className="eyebrow">THE GOOD-TO-KNOW STUFF</p>
				<h1>Terms of Service</h1>
				<p>
					These terms apply to use of Radon, a Discord bot for moderation, game coupon claiming, and server utilities. Effective date:
					October 31, 2026.
				</p>
			</header>
			<div className="document-sections">
				{sections.map((section) => (
					<section key={section.title} className="document-section">
						<h2>{section.title}</h2>
						<p>{section.body}</p>
					</section>
				))}
			</div>

			<p className="document-footer">
				For privacy details, see the{' '}
				<Link href="/privacy-policy" className="underline underline-offset-4">
					Privacy Policy
				</Link>
				.
			</p>
		</article>
	);
}
