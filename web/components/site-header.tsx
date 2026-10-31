'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DiscordIcon, RadonMark } from '@/components/brand';
import { site } from '@/lib/site';

const navigation = [
	['Features', '/#features'],
	['Games', '/#games'],
	['Commands', '/#commands'],
	['Getting started', '/guide']
];

export function SiteHeader() {
	const [open, setOpen] = useState(false);
	return (
		<header className="site-header">
			<div className="container header-inner">
				<Link href="/" className="wordmark" aria-label="Radon home">
					<RadonMark className="brand-mark" />
					<span>
						radon<span className="brand-dot">.</span>
					</span>
				</Link>
				<nav className="desktop-nav" aria-label="Main navigation">
					{navigation.map(([label, href]) => (
						<Link key={href} href={href}>
							{label}
						</Link>
					))}
				</nav>
				<div className="header-actions">
					<Button asChild className="button-primary header-invite">
						<a href={site.invite} target="_blank" rel="noopener noreferrer">
							<DiscordIcon />
							Add to Discord
							<ArrowUpRight />
						</a>
					</Button>
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger asChild>
							<Button className="mobile-toggle" variant="ghost" size="icon" aria-label="Open navigation">
								<Menu />
							</Button>
						</SheetTrigger>
						<SheetContent className="mobile-sheet">
							<SheetHeader>
								<SheetTitle className="wordmark">
									<RadonMark className="brand-mark" />
									radon.
								</SheetTitle>
								<SheetDescription className="sr-only">Explore features, games, commands, and the player guide.</SheetDescription>
							</SheetHeader>
							<nav aria-label="Mobile navigation" className="mobile-nav">
								{navigation.map(([label, href]) => (
									<Link key={href} href={href} onClick={() => setOpen(false)}>
										{label}
										<ArrowUpRight size={18} />
									</Link>
								))}
								<Link href="/privacy-policy" onClick={() => setOpen(false)}>
									Privacy policy
								</Link>
								<Link href="/terms-of-service" onClick={() => setOpen(false)}>
									Terms of service
								</Link>
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
