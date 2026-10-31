import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { DocumentHeading } from '@/components/document-heading';
import { pageMetadata } from '@/lib/metadata';
import { updates, updateDate } from '@/lib/updates';

export const metadata = pageMetadata(
	'What’s new',
	'See the latest Radon updates, new Discord commands, game coupon features, and fixes.',
	'/updates'
);

export default function UpdatesPage() {
	return (
		<div className="container legal-page updates-page">
			<DocumentHeading eyebrow="A LITTLE BETTER, EVERY UPDATE" title="What’s new.">
				New features, useful improvements, and the little fixes that make a difference. Run <code>/updates</code> in Discord to catch up
				there, too.
			</DocumentHeading>
			<div className="updates-timeline">
				{updates.map((update, index) => (
					<article key={update.id} id={update.id} className="update-entry" aria-labelledby={`${update.id}-title`}>
						<div className="update-meta">
							<time dateTime={update.date}>{updateDate(update.date)}</time>
							{index === 0 && (
								<span className="outline-pill">
									<Sparkles size={13} aria-hidden="true" />
									LATEST
								</span>
							)}
						</div>
						<div className="update-body">
							<h2 id={`${update.id}-title`}>
								<a href={`#${update.id}`}>{update.title}</a>
							</h2>
							<p>{update.summary}</p>
							<ul>
								{update.changes.map((change) => (
									<li key={change}>{change}</li>
								))}
							</ul>
						</div>
					</article>
				))}
			</div>
			<aside className="updates-help">
				<h2>Something doesn’t look right?</h2>
				<p>
					Use <code>/bug</code> in Discord to report a problem privately to the bot owner. Include what you expected, what happened, and how
					to reproduce it. Never include passwords or tokens.
				</p>
				<Link href="/guide" className="text-link">
					Visit the player guide
					<ArrowUpRight size={15} aria-hidden="true" />
				</Link>
			</aside>
		</div>
	);
}
