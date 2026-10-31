import Link from 'next/link';
import { ArrowUpRight, Gamepad2, ShieldCheck } from 'lucide-react';

export function GuideSwitcher({ current }: { current: 'player' | 'server' }) {
	return (
		<nav className="guide-switcher" aria-label="Guide topics">
			<Link href="/guide" aria-current={current === 'player' ? 'page' : undefined}>
				<Gamepad2 size={21} aria-hidden="true" />
				<span>
					<strong>Player guide</strong>
					<small>Accounts, coupons & optional perks</small>
				</span>
				<ArrowUpRight size={17} aria-hidden="true" />
			</Link>
			<Link href="/guide/server" aria-current={current === 'server' ? 'page' : undefined}>
				<ShieldCheck size={21} aria-hidden="true" />
				<span>
					<strong>Server guide</strong>
					<small>Moderation, records & everyday tools</small>
				</span>
				<ArrowUpRight size={17} aria-hidden="true" />
			</Link>
		</nav>
	);
}
