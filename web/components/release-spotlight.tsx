import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Gamepad2, ShieldCheck, Sparkles } from 'lucide-react';
import { RadonMark } from '@/components/brand';
import { release } from '@/lib/release';

export function ReleaseSpotlight() {
	return (
		<section className="v3-release" aria-labelledby="v3-title">
			<div className="v3-hero">
				<div className="v3-copy">
					<span className="v3-pill">
						<Sparkles size={14} aria-hidden="true" />
						{release.name} · VERSION {release.version}
					</span>
					<h2 id="v3-title">
						Four years in.
						<br />
						<span>A whole new chapter.</span>
					</h2>
					<p>{release.summary}</p>
					<div className="v3-status">
						<span aria-hidden="true" />
						{release.status}
					</div>
					<a href="#radon-v3" className="text-link">
						See everything that’s new
						<ArrowDown size={15} aria-hidden="true" />
					</a>
				</div>
				<figure className="v3-art" aria-label="Radon’s new lavender R logo, the face of version 3">
					<div className="v3-orbit v3-orbit-outer" aria-hidden="true" />
					<div className="v3-orbit v3-orbit-inner" aria-hidden="true" />
					<div className="v3-logo">
						<RadonMark />
					</div>
					<span className="v3-art-tag">
						<Gamepad2 size={15} aria-hidden="true" />
						More worlds.
					</span>
					<span className="v3-art-tag v3-art-tag-two">
						<ShieldCheck size={15} aria-hidden="true" />
						Calmer communities.
					</span>
					<figcaption>A fresh face. A familiar teammate.</figcaption>
				</figure>
			</div>
			<div className="v3-history">
				<span>2022 → 2026</span>
				<p>
					From the first commit in February 2022 to the next chapter. Thank you for four years of communities, feedback, and little moments
					that made Radon better.
				</p>
			</div>
			<div className="v3-comparison-heading">
				<span className="eyebrow">FAMILIAR FOUNDATIONS. MORE POSSIBILITIES.</span>
				<h3>What’s different this time?</h3>
				<p>The earlier version already had useful tools. V3 builds on them.</p>
			</div>
			<div className="v3-comparisons">
				{release.improvements.map((item, index) => (
					<article className="v3-comparison" key={item.area}>
						<div className="v3-comparison-title">
							<span>0{index + 1}</span>
							<h4>{item.area}</h4>
						</div>
						<div className="v3-then">
							<span>BEFORE</span>
							<p>{item.before}</p>
						</div>
						<div className="v3-now">
							<span>
								<Check size={13} aria-hidden="true" />
								WITH V3
							</span>
							<p>{item.now}</p>
						</div>
					</article>
				))}
			</div>
			<div className="v3-next">
				<div>
					<h3>Find your next move.</h3>
					<p>Quick explanations, real examples, and the commands to try.</p>
				</div>
				<div>
					<Link href="/guide">
						Player guide
						<ArrowUpRight size={16} aria-hidden="true" />
					</Link>
					<Link href="/guide/server">
						Server guide
						<ArrowUpRight size={16} aria-hidden="true" />
					</Link>
				</div>
			</div>
			<p className="v3-availability">
				<Sparkles size={15} aria-hidden="true" />
				Core commands and native Discord presets do not require Message Content access. Custom message inspection and join-burst detection
				depend on the relevant Discord access and operator configuration. Intent-dependent features are not switched on by this announcement.
			</p>
			<a href="#radon-v3" className="text-link">
				Read the shared Discord update
				<ArrowRight size={15} aria-hidden="true" />
			</a>
		</section>
	);
}
