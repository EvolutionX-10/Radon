'use client';

import { useState } from 'react';
import { ArrowDown, ArrowRight, Check, FileText, Flag, History, LockKeyhole, MessageSquareWarning, ShieldCheck, Timer, Zap } from 'lucide-react';
import { GuideCommand } from '@/components/guide-command';

const situations = [
	{
		label: 'A rule was broken',
		icon: MessageSquareWarning,
		tool: 'Start with a warning',
		description: 'For a rule breach you want to record and count toward your server’s warning policy.',
		command: '/warn add target:@Member reason:Repeated off-topic posts severity:1',
		outcome: 'A warning is saved. Its active severity counts toward any warning actions staff configured.',
		href: '#warnings',
		link: 'Understand warnings',
		event: 'Repeated off-topic posts',
		record: 'Warning · severity 1'
	},
	{
		label: 'It needs to stop now',
		icon: Timer,
		tool: 'Give the conversation a breather',
		description: 'A member is disrupting chat right now. A timeout limits their participation while they stay in the server.',
		command: '/timeout target:@Member duration:10m reason:Repeated disruption',
		outcome: 'The member is timed out for ten minutes. This direct action does not add a warning.',
		href: '#actions',
		link: 'Compare moderation actions',
		event: 'Disruption continues',
		record: 'Timeout · 10 minutes'
	},
	{
		label: 'Someone appeals',
		icon: History,
		tool: 'Look up what happened',
		description: 'Start with their recorded actions, then open the relevant case to review the reason and staff follow-up.',
		command: '/case history member:@Member',
		outcome: 'You get recent Radon cases, including warnings, kicks, bans, and timeouts. Nothing is punished or undone.',
		href: '#cases',
		link: 'Understand cases & logs',
		event: 'A member asks for a review',
		record: 'History · available to staff'
	},
	{
		label: 'A member spots abuse',
		icon: Flag,
		tool: 'Report the message privately',
		description: 'Use the message’s Apps menu → Report Message. Server staff can inspect the evidence before deciding what to do.',
		command: '/reports list',
		outcome: 'Staff can find saved reports here. Submitting a report does not automatically punish anyone.',
		href: '#reports',
		link: 'Follow a report',
		event: 'A suspicious message',
		record: 'Report · waiting for review'
	},
	{
		label: 'Spam keeps coming',
		icon: Zap,
		tool: 'Observe first. Automate when ready.',
		description: 'Use AutoMod for repeated patterns. Start with alerts so staff can see what a rule would catch.',
		command: '/automod native preset:mentions mode:observe alert_channel:#staff-alerts mention_limit:5',
		outcome: 'Discord alerts staff about matching mention spam. Observe mode does not block the message.',
		href: '#automod',
		link: 'Choose an AutoMod rule',
		event: 'Repeated mention spam',
		record: 'Observe · alert only'
	},
	{
		label: 'A channel needs a pause',
		icon: LockKeyhole,
		tool: 'Pause the channel, then restore it',
		description: 'Use a lock when you need to stop a channel’s activity for a role. Add an optional duration in the confirmation form.',
		command: '/lock text channel:#general',
		outcome: 'After confirmation, Radon saves the affected permissions and applies the lock. Unlock restores those saved settings.',
		href: '#locks',
		link: 'Understand locks',
		event: 'Chat needs a reset',
		record: 'Lock · saved permissions'
	}
];

export function ModerationPicker() {
	const [selected, setSelected] = useState(0);
	const current = situations[selected];
	return (
		<div className="situation-picker">
			<div className="situation-options" role="group" aria-label="Choose your situation">
				{situations.map((item, index) => (
					<button
						type="button"
						key={item.label}
						aria-pressed={selected === index}
						aria-controls="situation-result"
						onClick={() => setSelected(index)}
					>
						<item.icon size={18} aria-hidden="true" />
						<span>{item.label}</span>
						<ArrowRight size={15} aria-hidden="true" />
					</button>
				))}
			</div>
			<div id="situation-result" className="situation-result">
				<div className="situation-copy" aria-live="polite" aria-atomic="true">
					<span className="handbook-kicker">A GOOD PLACE TO START</span>
					<h3>{current.tool}</h3>
					<p>{current.description}</p>
				</div>
				<div className="situation-visual" aria-label="Example flow">
					<span>
						<current.icon size={17} aria-hidden="true" />
						{current.event}
					</span>
					<ArrowDown size={18} aria-hidden="true" />
					<span className="situation-record">
						<ShieldCheck size={18} aria-hidden="true" />
						{current.record}
						<Check size={15} aria-hidden="true" />
					</span>
					<small>
						<FileText size={12} aria-hidden="true" />
						Illustration only · no live Discord action
					</small>
				</div>
				<GuideCommand key={current.command} command={current.command} />
				<p className="situation-outcome">{current.outcome}</p>
				<a className="handbook-link" href={current.href}>
					{current.link}
					<ArrowRight size={15} aria-hidden="true" />
				</a>
			</div>
		</div>
	);
}
