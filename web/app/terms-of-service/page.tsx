import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Terms of Service',
	description: 'Terms for using the Radon Discord moderation bot.'
};

const sections = [
	{
		title: '1. Acceptance of terms',
		body: 'By inviting or using Radon, you agree to these Terms of Service. If you do not agree, do not use the bot.'
	},
	{
		title: '2. Intended use',
		body: 'Radon is provided for Discord server moderation and management tasks. You must use it in compliance with Discord rules and applicable law.'
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
		<article className="content-panel p-6 md:p-9">
			<span className="badge">Legal</span>
			<h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Terms of Service</h1>
			<p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">
				These terms apply to use of Radon, a Discord moderation bot. Effective date: April 4, 2026.
			</p>

			<div className="mt-6 space-y-4">
				{sections.map((section) => (
					<section key={section.title} className="rounded-xl border border-slate-200 bg-white/70 p-4 md:p-5">
						<h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
						<p className="mt-2 text-sm leading-7 text-slate-700 md:text-base">{section.body}</p>
					</section>
				))}
			</div>

			<p className="mt-6 text-sm text-slate-600">
				For privacy details, see the{' '}
				<Link href="/privacy-policy" className="underline underline-offset-4">
					Privacy Policy
				</Link>
				.
			</p>
		</article>
	);
}
