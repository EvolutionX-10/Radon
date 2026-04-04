import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Privacy Policy',
	description: 'Privacy policy for the Radon Discord moderation bot.'
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
		body: 'Feature-specific entries such as nickname locks, member code lists, claim settings, and optional AI chat channel configuration.'
	}
];

const policySections = [
	{
		title: '1. Information we process',
		body: 'Radon processes only the data needed to provide moderation and utility features in Discord servers where it is installed.'
	},
	{
		title: '2. How information is used',
		body: 'Data is used to execute moderation actions, keep server configuration state, and provide command results and related automation.'
	},
	{
		title: '3. AI chat mode',
		body: 'If AI chat mode is enabled by server admins, channel-level AI settings are stored. Message content can be processed to generate replies in that channel.'
	},
	{
		title: '4. Data retention',
		body: 'Data is retained for operational moderation needs and can be updated or removed when no longer required by bot functionality.'
	},
	{
		title: '5. Data sharing',
		body: 'Radon does not sell personal data. Data is only processed as required for bot operation and integrated services.'
	},
	{
		title: '6. Security',
		body: 'Reasonable technical safeguards are applied, but no platform can guarantee absolute security or uninterrupted availability.'
	},
	{
		title: '7. Policy updates',
		body: 'This policy may change as the bot evolves. Continued use after updates means acceptance of the latest version.'
	}
];

export default function PrivacyPolicyPage() {
	return (
		<article className="content-panel p-6 md:p-9">
			<span className="badge">Legal</span>
			<h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Privacy Policy</h1>
			<p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">
				This policy explains what data Radon processes and why. Effective date: April 4, 2026.
			</p>

			<div className="mt-6 grid gap-4 md:grid-cols-3">
				{dataGroups.map((group) => (
					<section key={group.title} className="rounded-xl border border-slate-200 bg-white/70 p-4 md:p-5">
						<h2 className="text-base font-semibold text-slate-900">{group.title}</h2>
						<p className="mt-2 text-sm leading-6 text-slate-700">{group.body}</p>
					</section>
				))}
			</div>

			<div className="mt-6 space-y-4">
				{policySections.map((section) => (
					<section key={section.title} className="rounded-xl border border-slate-200 bg-white/70 p-4 md:p-5">
						<h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
						<p className="mt-2 text-sm leading-7 text-slate-700 md:text-base">{section.body}</p>
					</section>
				))}
			</div>

			<p className="mt-6 text-sm text-slate-600">
				For usage rules, see the{' '}
				<Link href="/terms-of-service" className="underline underline-offset-4">
					Terms of Service
				</Link>
				.
			</p>
		</article>
	);
}
