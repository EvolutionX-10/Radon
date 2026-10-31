import Link from 'next/link';
import {
	ArrowDown,
	ArrowRight,
	ArrowUpRight,
	BellRing,
	Check,
	ChevronRight,
	Gamepad2,
	Gift,
	Heart,
	Layers3,
	MousePointer2,
	ShieldCheck,
	Sparkles,
	Terminal,
	Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscordIcon, Sparkle } from '@/components/brand';
import { BotPreview } from '@/components/bot-preview';
import { CommandBrowser } from '@/components/command-browser';
import { GameArt } from '@/components/game-art';
import { FAQ } from '@/components/faq';
import { games, site } from '@/lib/site';

export default function Home() {
	return (
		<>
			<section className="hero container" aria-labelledby="hero-title">
				<div className="hero-copy">
					<Link href="#games" className="announcement">
						<span className="new-pill">LEVEL UP</span>Three games. One very good bot.
						<ChevronRight size={14} />
					</Link>
					<h1 id="hero-title">
						Your server.
						<br />A whole lot
						<br />
						<span className="hero-highlight">
							more alive.
							<svg viewBox="0 0 380 18" preserveAspectRatio="none" aria-hidden="true">
								<path d="M3 13Q190-7 377 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
							</svg>
						</span>
					</h1>
					<p className="hero-description">
						Game rewards, a safer community, and less of the busywork. Meet Radon. Your server’s new favorite teammate.
					</p>
					<div className="hero-actions">
						<Button asChild className="button-primary button-large">
							<a href={site.invite} target="_blank" rel="noopener noreferrer">
								<DiscordIcon />
								Add to Discord
								<ArrowUpRight />
							</a>
						</Button>
						<Button asChild variant="ghost" className="button-text">
							<Link href="#features">
								Meet your new bot
								<ArrowDown />
							</Link>
						</Button>
					</div>
					<div className="hero-footnote">
						<span>
							<Check size={14} />
							Free to get started
						</span>
						<span>
							<Check size={14} />
							At home in Discord
						</span>
					</div>
				</div>
				<BotPreview />
			</section>
			<div className="promise-strip">
				<div className="container promise-inner">
					<span className="promise-intro">BUILT FOR THE WAY YOU DISCORD</span>
					<span>
						<Gamepad2 />
						More game time
					</span>
					<span>
						<ShieldCheck />
						Calmer communities
					</span>
					<span>
						<Zap />
						Fewer extra steps
					</span>
					<span>
						<Heart />
						More good moments
					</span>
				</div>
			</div>
			<section className="section container" id="features" aria-labelledby="features-title">
				<div className="section-heading">
					<div>
						<span className="eyebrow">
							<span />A LITTLE BOT. A LOT OF POSSIBILITIES.
						</span>
						<h2 id="features-title">
							Your community has potential.
							<br />
							<span className="muted-heading">Let’s make room for it.</span>
						</h2>
					</div>
					<p>
						From that first coupon to the everyday mod work,
						<br className="desktop-break" />
						Radon keeps the useful stuff close.
					</p>
				</div>
				<div className="feature-grid">
					<article className="feature-card feature-coupons">
						<span className="feature-icon">
							<Gift />
						</span>
						<h3>
							Good games.
							<br />
							Even better rewards.
						</h3>
						<p>Save your accounts, press CLAIM, and get back to playing. One coupon can work across your saved accounts.</p>
						<div className="mini-claim" aria-hidden="true">
							<div>
								<span className="mini-avatar">M</span>
								<span>Main account</span>
								<Check />
							</div>
							<div>
								<span className="mini-avatar alt-avatar">A</span>
								<span>Your trusty alt</span>
								<Check />
							</div>
							<div className="mini-claim-bottom">
								<Layers3 size={14} />
								<span>Separate accounts for every game</span>
							</div>
						</div>
						<Link href="#games" className="card-link">
							Find your game
							<ArrowUpRight size={16} />
						</Link>
					</article>
					<article className="feature-card feature-moderation">
						<span className="feature-icon">
							<ShieldCheck />
						</span>
						<h3>
							Keep the peace.
							<br />
							Keep your people.
						</h3>
						<p>Warnings, timeouts, bans, and clear mod logs. Give your team practical tools to keep things welcoming.</p>
						<div className="mini-mod" aria-hidden="true">
							<div className="mini-mod-top">
								<ShieldCheck size={16} />
								<span>MOD ACTION</span>
								<span className="tiny-dot" />
							</div>
							<strong>A clear reason. A useful record.</strong>
							<div>
								<span>Action</span>
								<code>Timeout · 10m</code>
							</div>
							<div>
								<span>Reason</span>
								<span>Repeated spam</span>
							</div>
						</div>
						<Link href="#commands" className="card-link">
							Explore moderation
							<ArrowUpRight size={16} />
						</Link>
					</article>
					<article className="feature-card feature-help">
						<span className="feature-icon">
							<Terminal />
						</span>
						<h3>
							Less “how do I…?”
							<br />
							More “got it.”
						</h3>
						<p>A private command browser and player guide, right in Discord. Help that fits your role, server, and channel.</p>
						<div className="mini-help" aria-hidden="true">
							<span className="mini-command">
								/help<span>↵</span>
							</span>
							<div>
								<Sparkles size={16} />
								<span>Your next move, made simple.</span>
							</div>
							<span className="mini-help-label">GAMES &nbsp; / &nbsp; MODERATION &nbsp; / &nbsp; UTILITIES</span>
						</div>
						<Link href="/guide" className="card-link">
							Get the quick start
							<ArrowUpRight size={16} />
						</Link>
					</article>
				</div>
			</section>
			<section className="games-section" id="games" aria-labelledby="games-title">
				<div className="container section">
					<div className="section-heading">
						<div>
							<span className="eyebrow">
								<span />
								LESS REDEEMING. MORE PLAYING.
							</span>
							<h2 id="games-title">
								Three worlds.
								<br />
								<span className="lavender-text">One place to claim.</span>
							</h2>
						</div>
						<div className="games-summary">
							<span className="outline-pill">
								<Gamepad2 size={14} />3 supported games
							</span>
							<p>
								Your accounts stay separate.
								<br />
								Your next reward stays a click away.
							</p>
						</div>
					</div>
					<div className="game-grid">
						{games.map((game, index) => (
							<Link href={`/guide#${game.id}`} key={game.id} className={`game-card game-${game.theme}`}>
								<div className="game-cover">
									<span className="game-index">0{index + 1} / GAME COLLECTION</span>
									<GameArt theme={game.theme} />
									<div className="game-cover-title">
										<span>{game.label}</span>
										<h3>{game.short}</h3>
										<strong>{game.subtitle}</strong>
									</div>
									<span className="game-arrow">
										<ArrowUpRight size={20} />
									</span>
								</div>
								<div className="game-card-detail">
									<p>{game.description}</p>
									<span>
										How to claim
										<ArrowRight size={15} />
									</span>
								</div>
							</Link>
						))}
					</div>
					<div className="game-note">
						<ShieldCheck size={16} />
						<p>Five saved accounts per game, free. No password needed. Just your in-game Member Code.</p>
						<Link href="/guide">
							See the player guide
							<ArrowUpRight size={14} />
						</Link>
					</div>
				</div>
			</section>
			<section className="section container" id="commands" aria-labelledby="commands-title">
				<div className="section-heading">
					<div>
						<span className="eyebrow">
							<span />A SLASH IS ALL IT TAKES
						</span>
						<h2 id="commands-title">
							Big on useful.
							<br />
							<span className="muted-heading">Small on complicated.</span>
						</h2>
					</div>
					<p>
						Get a feel for what Radon can do.
						<br />
						Pick a command to see how it works.
					</p>
				</div>
				<CommandBrowser />
			</section>
			<section className="container start-support-grid" aria-label="Get started and support Radon">
				<article className="start-card">
					<span className="eyebrow">
						<span />
						YOU’RE THREE STEPS AWAY
					</span>
					<h2>
						Make yourself
						<br />
						right at home.
					</h2>
					<ol className="steps">
						<li>
							<span>01</span>
							<div>
								<h3>Bring Radon along</h3>
								<p>Add the bot and choose your Discord server.</p>
							</div>
						</li>
						<li>
							<span>02</span>
							<div>
								<h3>Find your starting point</h3>
								<p>
									Run <code>/help</code> for commands or <code>/guide</code> for games.
								</p>
							</div>
						</li>
						<li>
							<span>03</span>
							<div>
								<h3>Make it your own</h3>
								<p>Save a game account or set up your mod tools.</p>
							</div>
						</li>
					</ol>
					<Button asChild variant="outline" className="button-secondary">
						<Link href="/guide">
							Walk me through it
							<ArrowUpRight />
						</Link>
					</Button>
				</article>
				<article className="support-card">
					<Sparkle className="support-sparkle" />
					<div className="support-badge">
						<Heart size={14} />A LITTLE LOVE GOES A LONG WAY
					</div>
					<h2>
						Like Radon?
						<br />
						Give it a little boost.
					</h2>
					<p>
						Vote on either listing and verify it with <code>/vote</code> to unlock a 24-hour Supporter Pass.
					</p>
					<ul className="support-perks">
						<li>
							<Layers3 />
							<div>
								<strong>Room for your whole roster</strong>
								<span>Ten saved accounts per game instead of five.</span>
							</div>
						</li>
						<li>
							<BellRing />
							<div>
								<strong>A heads-up for your next reward</strong>
								<span>Opt-in DMs for new staff-posted coupons.</span>
							</div>
						</li>
					</ul>
					<div className="support-links">
						<Button asChild className="button-dark">
							<a href={site.topgg} target="_blank" rel="noopener noreferrer">
								Vote on Top.gg
								<ArrowUpRight />
							</a>
						</Button>
						<a href={site.dbl} target="_blank" rel="noopener noreferrer" className="text-link">
							Discord Bot List
							<ArrowUpRight size={14} />
						</a>
					</div>
					<p className="support-fineprint">
						Always optional. Free claiming stays free. Perks require a verified vote, last 24 hours, and don’t stack.
					</p>
				</article>
			</section>
			<section className="section container faq-section" aria-labelledby="faq-title">
				<div className="faq-heading">
					<span className="eyebrow">
						<span />A FEW THINGS YOU MIGHT BE WONDERING
					</span>
					<h2 id="faq-title">
						Good questions.
						<br />
						<span className="muted-heading">Straight answers.</span>
					</h2>
					<p>
						Need a little more detail?
						<br />
						There’s a guide for that.
					</p>
					<Link href="/guide" className="text-link">
						Read the player guide
						<ArrowUpRight size={16} />
					</Link>
				</div>
				<FAQ />
			</section>
			<section className="container final-cta" aria-labelledby="cta-title">
				<Sparkle className="cta-sparkle sparkle-one" />
				<Sparkle className="cta-sparkle sparkle-two" />
				<span className="eyebrow">YOUR NEXT GREAT SERVER ADDITION</span>
				<h2 id="cta-title">
					Good company.
					<br />
					Great possibilities.
				</h2>
				<p>Your community brings the people. Radon brings the backup.</p>
				<Button asChild className="button-primary button-large">
					<a href={site.invite} target="_blank" rel="noopener noreferrer">
						<DiscordIcon />
						Let’s add Radon
						<ArrowUpRight />
					</a>
				</Button>
				<span className="cta-footnote">
					<MousePointer2 size={13} />A few clicks from your new favorite teammate.
				</span>
			</section>
		</>
	);
}
