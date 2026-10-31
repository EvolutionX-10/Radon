import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Geist, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { RadonMark } from '@/components/brand';
import { site } from '@/lib/site';
import './globals.css';

const headingFont = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const bodyFont = Geist({ variable: '--font-body', subsets: ['latin'], display: 'swap' });
const monoFont = JetBrains_Mono({ variable: '--font-code', subsets: ['latin'], display: 'swap' });
const description = 'Your server’s new favorite teammate. Claim game coupons, manage your community, and skip the busywork with Radon for Discord.';

export const metadata: Metadata = {
	metadataBase: new URL(site.url),
	title: { default: 'Radon — Your server. A whole lot more alive.', template: '%s | Radon' },
	description,
	openGraph: { type: 'website', locale: 'en_US', siteName: 'Radon', title: 'Radon — Your server. A whole lot more alive.', description },
	twitter: { card: 'summary_large_image', title: 'Radon — Your server. A whole lot more alive.', description }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`dark ${headingFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
			<body>
				<a href="#main-content" className="skip-link">
					Skip to content
				</a>
				<SiteHeader />
				<main id="main-content">{children}</main>
				<footer className="site-footer container">
					<div className="footer-top">
						<div>
							<Link href="/" className="wordmark" aria-label="Radon home">
								<RadonMark className="brand-mark" />
								<span>
									radon<span className="brand-dot">.</span>
								</span>
							</Link>
							<p>A little bot. A better place to hang out.</p>
						</div>
						<nav aria-label="Footer navigation">
							<div>
								<span>EXPLORE</span>
								<Link href="/#features">Features</Link>
								<Link href="/#games">Supported games</Link>
								<Link href="/#commands">Commands</Link>
							</div>
							<div>
								<span>GOOD TO KNOW</span>
								<Link href="/guide">Getting started</Link>
								<Link href="/terms-of-service">Terms of service</Link>
								<Link href="/privacy-policy">Privacy policy</Link>
							</div>
							<div>
								<span>ELSEWHERE</span>
								<a href={site.github} target="_blank" rel="noopener noreferrer">
									GitHub
									<ArrowUpRight size={13} />
								</a>
								<a href={site.topgg} target="_blank" rel="noopener noreferrer">
									Top.gg
									<ArrowUpRight size={13} />
								</a>
								<a href={site.dbl} target="_blank" rel="noopener noreferrer">
									Discord Bot List
									<ArrowUpRight size={13} />
								</a>
							</div>
						</nav>
					</div>
					<div className="footer-bottom">
						<span>© {new Date().getFullYear()} Radon. Made for communities.</span>
						<span>Independent project. Not affiliated with Discord or game publishers.</span>
					</div>
				</footer>
			</body>
		</html>
	);
}
