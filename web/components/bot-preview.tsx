'use client';

import { useState } from 'react';
import { Check, CheckCheck, Gift, Hash, Headphones, Mic, Plus, ShieldCheck, Sparkles, Users, Volume2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RadonMark, Sparkle } from '@/components/brand';

export function BotPreview() {
	const [claimed, setClaimed] = useState(false);
	return (
		<div className="preview-scene">
			<div className="preview-orbit" aria-hidden="true" />
			<Sparkle className="scene-star" />
			<div className="floating-label">
				<span className="status-dot" />
				GOOD VIBES. GREAT BOT.
			</div>
			<Tabs defaultValue="coupons" className="discord-window">
				<div className="discord-titlebar">
					<span className="window-dots" aria-hidden="true">
						<i />
						<i />
						<i />
					</span>
					<span>YOUR SERVER, UPGRADED</span>
					<Sparkles size={13} />
				</div>
				<div className="discord-body">
					<aside className="server-rail" aria-hidden="true">
						<RadonMark className="rail-logo" />
						<div className="rail-divider" />
						<span className="server-icon">☻</span>
						<span className="server-icon server-active">✦</span>
						<span className="server-icon">
							<Plus size={20} />
						</span>
					</aside>
					<div className="discord-main">
						<div className="channel-title">
							<Hash size={20} />
							<strong>the-good-stuff</strong>
							<span className="channel-divider" />
							<Users size={17} />
						</div>
						<TabsList className="preview-tabs" aria-label="Bot preview">
							<TabsTrigger value="coupons">
								<Gift />
								Coupons
							</TabsTrigger>
							<TabsTrigger value="moderation">
								<ShieldCheck />
								Moderation
							</TabsTrigger>
							<TabsTrigger value="community">
								<Users />
								Community
							</TabsTrigger>
						</TabsList>
						<div className="chat-area">
							<div className="chat-date">
								<span />A little preview of what’s possible
								<span />
							</div>
							<div className="chat-message user-message">
								<div className="user-avatar">J</div>
								<div>
									<div className="chat-author">
										Jamie <small>Today at 12:30</small>
									</div>
									<p>okay, this is going to be our new favorite bot 👀</p>
								</div>
							</div>
							<div className="chat-message">
								<RadonMark className="bot-avatar" />
								<div className="bot-message">
									<div className="chat-author">
										Radon{' '}
										<span className="app-tag">
											<Check size={9} />
											APP
										</span>
										<small>Today at 12:31</small>
									</div>
									<TabsContent value="coupons" className="preview-panel">
										<div className="embed-kicker">
											<Gift size={13} /> SOLO LEVELING: ARISE
										</div>
										<h3>A little loot for your next adventure.</h3>
										<p>A new coupon, ready for your saved accounts.</p>
										<div className="coupon-code">
											<span>EXAMPLE CODE</span>
											<code>YOURNEXTLEVEL</code>
											<Gift size={22} />
										</div>
										<div className="embed-footer">
											<span className="status-dot" />
											Your accounts. One click. Let’s go.
										</div>
										<Button onClick={() => setClaimed(!claimed)} className={`claim-button ${claimed ? 'claimed' : ''}`}>
											{claimed ? <CheckCheck /> : <Gift />}
											{claimed ? 'Example claimed! Reset demo' : 'Try the CLAIM button'}
										</Button>
										<p className="demo-result" role="status">
											{claimed
												? 'Demo complete · Real rewards arrive in your game’s mailbox.'
												: 'Interactive demo · No account or real coupon needed.'}
										</p>
									</TabsContent>
									<TabsContent value="moderation" className="preview-panel">
										<div className="embed-kicker">
											<ShieldCheck size={13} /> MODERATION
										</div>
										<h3>Good communities have good backup.</h3>
										<p>Clear reasons. Useful records. More control for your team.</p>
										<div className="mod-example">
											<ShieldCheck />
											<div>
												<strong>Timeout recorded</strong>
												<span>Duration: 10 minutes</span>
												<span>Reason: Repeated spam</span>
											</div>
											<CheckCheck />
										</div>
										<div className="embed-footer">
											<span className="status-dot" />
											Your staff stays in control.
										</div>
										<p className="demo-result">Illustrative preview · No moderation action is performed.</p>
									</TabsContent>
									<TabsContent value="community" className="preview-panel">
										<div className="embed-kicker">
											<Sparkles size={13} /> BUILT FOR YOUR SERVER
										</div>
										<h3>A little help goes a long way.</h3>
										<p>Find the right command, right where your community hangs out.</p>
										<div className="help-example">
											<code>/help</code>
											<span>
												Games & coupons <span>→</span>
											</span>
											<span>
												Moderation <span>→</span>
											</span>
											<span>
												Server utilities <span>→</span>
											</span>
										</div>
										<p className="demo-result">The live /help browser adapts to your permissions.</p>
									</TabsContent>
								</div>
							</div>
						</div>
						<div className="chat-composer" aria-hidden="true">
							<Plus size={18} />
							<span>Message #the-good-stuff</span>
							<Gift size={17} />
						</div>
					</div>
				</div>
				<div className="discord-status">
					<span>
						<Volume2 size={12} />A better place to hang out
					</span>
					<span>
						<Mic size={12} />
						<Headphones size={12} />
					</span>
				</div>
			</Tabs>
			<div className="floating-success">
				<span className="success-icon">
					<CheckCheck size={18} />
				</span>
				<div>
					<strong>Less busywork.</strong>
					<span>More of the good stuff.</span>
				</div>
				<Sparkles size={18} />
			</div>
		</div>
	);
}
