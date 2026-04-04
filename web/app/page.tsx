import Link from 'next/link';

export default function Home() {
	const highlights = [
		{
			title: 'Moderation essentials',
			body: 'Ban, kick, timeout, softban, lock, role tools, and warning workflows built for day-to-day server safety.'
		},
		{
			title: 'Actionable logs',
			body: 'Radon can emit clean mod action logs with moderator, target, reason, and duration context.'
		},
		{
			title: 'Server-level control',
			body: 'Permission-level checks, configurable roles, and utility commands keep actions restricted to the right staff.'
		}
	];

	const botInvite =
		'https://discord.com/api/oauth2/authorize?client_id=944833303226236989&scope=applications.commands+bot&permissions=543276137727';

	return (
		<section className="space-y-6 md:space-y-8">
			<article className="content-panel p-6 md:p-9">
				<span className="badge">Discord moderation bot</span>
				<h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
					Practical moderation tools that stay fast and predictable.
				</h1>
				<p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
					Radon is built for teams that need reliable moderation actions without bloated flows. It combines common moderation commands,
					warning automation, mod logs, and server utility commands in one place.
				</p>

				<div className="mt-6 flex flex-wrap gap-3">
					<a href={botInvite} target="_blank" rel="noreferrer" className="cta cta-primary">
						Invite Radon
					</a>
					<Link href="/terms-of-service" className="cta cta-secondary">
						Terms of Service
					</Link>
					<Link href="/privacy-policy" className="cta cta-secondary">
						Privacy Policy
					</Link>
				</div>
			</article>

			<article className="grid gap-4 md:grid-cols-3">
				{highlights.map((item) => (
					<section key={item.title} className="content-panel p-5">
						<h2 className="text-lg font-semibold tracking-tight text-slate-900">{item.title}</h2>
						<p className="mt-2 text-sm leading-6 text-slate-700">{item.body}</p>
					</section>
				))}
			</article>

			<article className="content-panel p-6 md:p-8">
				<h2 className="text-2xl font-semibold tracking-tight text-slate-900">What this website covers</h2>
				<p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 md:text-base">
					These pages describe the baseline legal terms for using Radon and how data is handled by bot features, including moderation
					actions, guild configuration, warning records, and optional AI chat channel settings.
				</p>
				<p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">Last updated: April 4, 2026.</p>
			</article>
		</section>
	);
}
