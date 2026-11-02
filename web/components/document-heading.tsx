import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function DocumentHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
	return (
		<header className="document-heading">
			<nav className="document-back" aria-label="Back navigation">
				<Link href="/" className="text-link">
					<ArrowLeft size={16} aria-hidden="true" />
					<span>Back to Radon</span>
				</Link>
			</nav>
			<div className="document-intro">
				<p className="eyebrow">{eyebrow}</p>
				<h1>{title}</h1>
				<p className="document-description">{children}</p>
			</div>
		</header>
	);
}
