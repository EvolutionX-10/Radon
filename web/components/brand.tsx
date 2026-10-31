import type { SVGProps } from 'react';

export function RadonMark(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
			<rect width="40" height="40" rx="12" fill="currentColor" />
			<path d="M12 29V11h10c5 0 8 2 8 6 0 3-2 5-5 6l5 6h-8l-7-9h6c2 0 3-1 3-3s-1-2-3-2h-3v14z" fill="#111216" />
		</svg>
	);
}

export function DiscordIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
			<path d="M19.7 5.2a18 18 0 0 0-4.4-1.4l-.6 1.2a16 16 0 0 0-5.4 0l-.6-1.2a18 18 0 0 0-4.4 1.4C1.5 9.3.7 13.3 1.1 17.2a18 18 0 0 0 5.5 2.7l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 11.2 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.5-2.7c.5-4.5-.8-8.5-3.2-12ZM8.5 14.7c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.9 2.2-1.9 2.2Zm7 0c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z" />
		</svg>
	);
}

export function Sparkle(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" {...props}>
			<path d="m50 0 10 35L85 15 65 40l35 10-35 10 20 25-25-20-10 35-10-35-25 20 20-25L0 50l35-10-20-25 25 20Z" />
		</svg>
	);
}
