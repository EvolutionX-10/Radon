import type { Metadata } from 'next';
import Link from 'next/link';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const headingFont = Space_Grotesk({
	variable: '--font-space-grotesk',
	subsets: ['latin']
});

const monoFont = JetBrains_Mono({
	variable: '--font-jetbrains-mono',
	subsets: ['latin']
});

export const metadata: Metadata = {
	title: {
		default: 'Radon | Discord Moderation Bot',
		template: '%s | Radon'
	},
	description: 'Radon is a moderation-first Discord bot focused on practical tools, clear controls, and reliable server safety.'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${headingFont.variable} ${monoFont.variable} h-full antialiased`}>
			<body className="min-h-full">
				<div className="grain-overlay" aria-hidden />
				<div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 md:px-8 md:py-8">
					<header className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-5">
						<Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
							Radon
						</Link>
						<nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
							<Link className="nav-link" href="/">
								Landing
							</Link>
							<Link className="nav-link" href="/terms-of-service">
								Terms
							</Link>
							<Link className="nav-link" href="/privacy-policy">
								Privacy
							</Link>
						</nav>
					</header>

					<main className="flex-1">{children}</main>

					<footer className="mt-8 border-t border-slate-200/80 px-1 pt-5 text-xs text-slate-600">Radon moderation bot website.</footer>
				</div>
			</body>
		</html>
	);
}
