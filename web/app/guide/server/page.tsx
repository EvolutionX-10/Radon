import Link from 'next/link';
import type { ReactNode } from 'react';
import {
	ArrowDown,
	ArrowRight,
	BookOpen,
	Check,
	ChevronDown,
	CircleHelp,
	ClipboardList,
	Clock3,
	FileText,
	Flag,
	History,
	Info,
	LockKeyhole,
	MessageSquare,
	MessageSquareWarning,
	Settings2,
	ShieldCheck,
	Timer,
	Users,
	Zap
} from 'lucide-react';
import { DocumentHeading } from '@/components/document-heading';
import { GuideSwitcher } from '@/components/guide-switcher';
import { GuideCommand } from '@/components/guide-command';
import { ModerationPicker } from '@/components/moderation-picker';
import { pageMetadata } from '@/lib/metadata';
import './server-guide.css';

export const metadata = pageMetadata(
	'Server guide: what to use, when & how',
	'A visual Radon handbook for server staff: practical examples for warnings, cases, mod logs, reports, AutoMod, temporary bans, locks, and everyday tools.',
	'/guide/server'
);

const chapters = [
	['choose', 'Find the right tool'],
	['setup', 'Set up your team'],
	['warnings', 'Warnings & severity'],
	['actions', 'Timeouts, kicks & bans'],
	['cases', 'Cases & mod logs'],
	['reports', 'Message reports'],
	['automod', 'AutoMod & raids'],
	['locks', 'Locks & slowmode'],
	['utilities', 'Everyday tools'],
	['help', 'Help & troubleshooting']
];

function Chapter({ id, number, label, title, children }: { id: string; number: string; label: string; title: string; children: ReactNode }) {
	return (
		<section className="handbook-chapter" id={id} aria-labelledby={`${id}-title`}>
			<div className="chapter-heading">
				<span className="chapter-number">{number}</span>
				<div>
					<span className="handbook-kicker">{label}</span>
					<h2 id={`${id}-title`}>{title}</h2>
				</div>
				<a href={`#${id}`} className="chapter-anchor" aria-label={`Link to ${title}`}>
					#
				</a>
			</div>
			{children}
		</section>
	);
}
function Note({ children }: { children: ReactNode }) {
	return (
		<div className="handbook-note">
			<Info size={18} aria-hidden="true" />
			<p>{children}</p>
		</div>
	);
}
function Question({ title, children }: { title: string; children: ReactNode }) {
	return (
		<details className="handbook-question">
			<summary>
				{title}
				<ChevronDown size={17} aria-hidden="true" />
			</summary>
			<div>{children}</div>
		</details>
	);
}

export default function ServerGuidePage() {
	return (
		<div className="container guide-page server-handbook">
			<DocumentHeading
				eyebrow="THE SERVER HANDBOOK"
				title={
					<>
						Good moderation.
						<br />
						<span className="lavender-text">Less guesswork.</span>
					</>
				}
			>
				What to use, when to use it, and what happens next. A practical guide for the people looking after the community.
			</DocumentHeading>
			<GuideSwitcher current="server" />
			<div className="handbook-intro">
				<span>
					<BookOpen size={15} aria-hidden="true" />
					Read a little. Try what you need.
				</span>
				<span>
					<ShieldCheck size={15} aria-hidden="true" />
					Examples only. Your server stays in your hands.
				</span>
			</div>
			<div className="guide-layout">
				<nav className="guide-nav" aria-label="On this page">
					<span>FIND YOUR WAY</span>
					{chapters.map(([id, title]) => (
						<a key={id} href={`#${id}`}>
							{title}
						</a>
					))}
				</nav>
				<div className="handbook-content">
					<Chapter id="choose" number="01" label="START WITH THE SITUATION" title="What are you trying to do?">
						<p className="chapter-lead">Pick something familiar. We’ll point you toward a useful tool.</p>
						<ModerationPicker />
						<p className="handbook-caption">
							Commands below are examples. Select real members, channels, and choices in Discord; replace CASE_ID, WARN_ID, and
							REPORT_ID with the matching reference.
						</p>
					</Chapter>

					<Chapter id="setup" number="02" label="BEFORE THE FIRST ACTION" title="Give your team a good starting point.">
						<div className="handbook-steps">
							<div>
								<span>1</span>
								<h3>Choose your staff</h3>
								<p>
									Run <code>/setup</code> as an administrator. Choose the existing roles Radon should recognize as moderators and
									administrators.
								</p>
							</div>
							<div>
								<span>2</span>
								<h3>Check the role order</h3>
								<p>
									Place Radon above the members it should manage. Staff must also outrank their targets. The bot needs the Discord
									permission for each action.
								</p>
							</div>
							<div>
								<span>3</span>
								<h3>Give actions a home</h3>
								<p>
									Choose a mod-log channel in setup. Review who can read it. Use <code>/help</code> to check what is available to
									your role and channel.
								</p>
							</div>
						</div>
						<Note>
							A role called “Moderator” does not grant access by its name alone. Configured staff roles, Discord command permissions,
							and role hierarchy all matter. Cases can still be saved without a mod-log channel.
						</Note>
					</Chapter>

					<Chapter id="warnings" number="03" label="RECORD A RULE BREACH" title="Warnings keep your policy consistent.">
						<p className="chapter-lead">
							Use a warning when an incident should count toward someone’s active warning severity. Staff choose the reason, severity,
							and optional expiry.
						</p>
						<div className="handbook-example">
							<span className="handbook-kicker">IN REAL LIFE</span>
							<p>
								A member keeps posting spoilers outside the spoiler channel. You want to record it, explain the rule, and follow the
								same escalation policy next time.
							</p>
						</div>
						<GuideCommand command="/warn add target:@Member reason:Spoilers outside the spoiler channel severity:1 expiration:7d" />
						<h3 className="handbook-subheading">Want Radon to act at a threshold?</h3>
						<p>
							An administrator can configure an action once. For example, timeout a member for ten minutes when their active severity
							crosses 3:
						</p>
						<GuideCommand command="/warn action create action:timeout severity:3 duration:10m" />
						<figure className="severity-visual">
							<figcaption>Example policy · configured by staff</figcaption>
							<div className="severity-track">
								<div>
									<span>1</span>
									<strong>First warning</strong>
									<small>Active severity: 1</small>
								</div>
								<ArrowRight aria-hidden="true" />
								<div>
									<span>+2</span>
									<strong>Another warning</strong>
									<small>Active severity: 3</small>
								</div>
								<ArrowRight aria-hidden="true" />
								<div className="severity-result">
									<Timer size={24} aria-hidden="true" />
									<strong>10-minute timeout</strong>
									<small>Threshold crossed</small>
								</div>
							</div>
						</figure>
						<div className="handbook-pair">
							<div>
								<h3>Review the warnings</h3>
								<GuideCommand command="/warn list target:@Member" />
								<p>
									Check the member’s active warnings, including each warning’s severity and expiry. Use{' '}
									<code>/warn action list</code> to review your server’s configured actions.
								</p>
							</div>
							<div>
								<h3>Remove a mistaken warning</h3>
								<GuideCommand command="/warn remove target:@Member warn_id:WARN_ID reason:Issued to the wrong member" />
								<p>Use the warning ID. Editing a case reason does not remove the warning or undo a punishment.</p>
							</div>
						</div>
						<Note>
							Severity is a score, not the number of warnings. Expired warnings stop contributing. Actions run on newly crossed
							thresholds; a failed automatic action needs staff review. Removing or expiring a warning does not undo a timeout or ban.
						</Note>
					</Chapter>

					<Chapter id="actions" number="04" label="WHEN AN ACTION IS NEEDED NOW" title="Choose the right kind of pause.">
						<p className="chapter-lead">
							You can act directly without adding a warning. Choose based on whether the member should stay, leave, or be kept out.
						</p>
						<div className="action-grid">
							{[
								{
									name: 'Timeout',
									icon: Timer,
									tag: 'STAYS IN THE SERVER',
									when: 'An argument needs a cooling-off period.',
									result: 'Limits participation temporarily, up to 28 days.',
									command: '/timeout target:@Member duration:10m reason:Repeated disruption'
								},
								{
									name: 'Kick',
									icon: Users,
									tag: 'CAN REJOIN',
									when: 'Someone needs to leave, but may return with an invite.',
									result: 'Removes them without banning them.',
									command: '/kick target:@Member reason:Repeated disruption'
								},
								{
									name: 'Ban',
									icon: ShieldCheck,
									tag: 'KEPT OUT',
									when: 'A scam account should not be able to return.',
									result: 'Removes them and prevents rejoining until unbanned.',
									command: '/ban user:@Member reason:Scam links'
								},
								{
									name: 'Temporary ban',
									icon: Clock3,
									tag: 'RETURN AFTER A BREAK',
									when: 'A current member needs a seven-day break from the server.',
									result: 'Bans them and saves an automatic-unban schedule.',
									command: '/tempban add member:@Member duration:7d reason:Repeated harassment'
								}
							].map((action) => (
								<article className="action-card" key={action.name}>
									<div className="action-card-top">
										<action.icon size={21} aria-hidden="true" />
										<span>{action.tag}</span>
									</div>
									<h3>{action.name}</h3>
									<p>{action.when}</p>
									<GuideCommand command={action.command} />
									<p className="action-result">
										<Check size={14} aria-hidden="true" />
										{action.result}
									</p>
								</article>
							))}
						</div>
						<Question title="How do I end or change a punishment?">
							<p>
								Remove a timeout with <code>/timeout target:@Member duration:0</code>. Use <code>/unban user:USER_ID</code> to lift a
								ban; an unbanned person still needs to rejoin.
							</p>
							<p>
								<code>/tempban list</code> shows pending automatic unbans. <code>/tempban cancel member:@Member</code> cancels the
								schedule and <strong>leaves the member banned</strong>. Cancel before deliberately replacing a temporary ban.
							</p>
						</Question>
						<Question title="When would I use a softban?">
							<p>
								A softban bans and then unbans a member to remove them and clean recent messages. They can rejoin with an invite. Use{' '}
								<code>/softban</code> and review its options in Discord. If the unban step fails, check the server’s ban list before
								doing anything else.
							</p>
						</Question>
						<Note>
							Temporary bans support 1 minute to 365 days and currently require someone in the server. Their schedule survives restarts,
							but automatic unbans can be delayed by downtime or Discord errors. Check the result and <code>/tempban list</code> if an
							action could not be confirmed.
						</Note>
					</Chapter>

					<Chapter id="cases" number="05" label="UNDERSTAND WHAT HAPPENED" title="Warnings, logs, cases. Each has a job.">
						<p className="chapter-lead">
							Keep using your normal moderation commands. Cases are saved automatically for recorded successful Radon moderation
							actions. The case commands are there when you want to look back or follow up.
						</p>
						<div className="record-map">
							<div>
								<MessageSquareWarning size={25} aria-hidden="true" />
								<h3>Warning</h3>
								<p>“What should count toward their severity?”</p>
								<span>Policy & escalation</span>
							</div>
							<div>
								<MessageSquare size={25} aria-hidden="true" />
								<h3>Mod log</h3>
								<p>“Tell our staff channel what happened.”</p>
								<span>Visible action summary</span>
							</div>
							<div>
								<ClipboardList size={25} aria-hidden="true" />
								<h3>Case</h3>
								<p>“Find the action and its follow-up later.”</p>
								<span>Stored record & staff notes</span>
							</div>
						</div>
						<div className="case-story">
							<div className="case-story-heading">
								<History size={20} aria-hidden="true" />
								<span>A REALISTIC STAFF HANDOFF</span>
								<span className="example-pill">Illustrative example</span>
							</div>
							<ol>
								<li>
									<span className="story-dot" />
									<div>
										<strong>You ban a scam account directly.</strong>
										<p>
											No warning was needed. Radon records the successful ban as a case and includes its reference in the mod
											log when available.
										</p>
									</div>
								</li>
								<li>
									<span className="story-dot" />
									<div>
										<strong>A moderator adds the missing context.</strong>
										<p>
											“Two members confirmed the same scam link.” This is a staff note on the ban case, with no extra
											punishment.
										</p>
									</div>
								</li>
								<li>
									<span className="story-dot" />
									<div>
										<strong>Another moderator handles the appeal.</strong>
										<p>
											They look up the member’s cases, open the ban record, and review the reason and recent notes before
											deciding.
										</p>
									</div>
								</li>
							</ol>
						</div>
						<div className="handbook-pair">
							<div>
								<h3>Find and open an action</h3>
								<GuideCommand command="/case history member:@Member" />
								<GuideCommand command="/case view id:CASE_ID" />
								<p>
									History shows ten cases at a time. For older ones, use the supplied reference in the <code>before</code> field.
									View shows the action, target, moderator, reason, and recent notes and edits.
								</p>
							</div>
							<div>
								<h3>Add context or clarify a reason</h3>
								<GuideCommand command="/case note id:CASE_ID text:Two members confirmed the same scam link." />
								<GuideCommand command="/case reason id:CASE_ID text:Repeated scam links in general chat" />
								<p>
									Notes are for staff follow-up. Reason edits retain the previous reason, editor, and time. Neither command issues
									or reverses a punishment.
								</p>
							</div>
						</div>
						<h3 className="handbook-subheading">Which reason editor should I use?</h3>
						<div className="reason-options">
							<div>
								<FileText size={19} aria-hidden="true" />
								<div>
									<strong>Use /case reason</strong>
									<p>
										Update the stored case reason and its audit trail. The Discord log message and warning record stay as they
										were.
									</p>
								</div>
							</div>
							<div>
								<MessageSquare size={19} aria-hidden="true" />
								<div>
									<strong>Use the mod log’s Edit Reason button</strong>
									<p>
										Update the Discord log and its associated case. For a valid warning log, it also updates the linked warning’s
										reason.
									</p>
								</div>
							</div>
						</div>
						<Note>
							A warning ID identifies a warning; a case ID identifies a recorded action; a report ID identifies a submitted report. They
							are different references. Cases cover newly recorded Radon actions, with no import of old logs or actions taken outside
							Radon. Staff can also use <code>/case help</code> in Discord.
						</Note>
					</Chapter>

					<Chapter id="reports" number="06" label="LET MEMBERS RAISE A CONCERN" title="A report asks staff to take a look.">
						<p className="chapter-lead">
							Use message reports when a member spots harassment or a suspicious post. Reports collect evidence for review; they do not
							automatically mean someone is guilty.
						</p>
						<GuideCommand command="/reports configure channel:#staff-reports" />
						<p>
							An administrator chooses a staff text channel hidden from @everyone. Check all role and member overrides so only trusted
							staff can read it. Radon needs View Channel, Send Messages, and Embed Links there.
						</p>
						<div className="report-flow">
							<div>
								<Flag size={24} aria-hidden="true" />
								<h3>1. A member reports</h3>
								<p>Open the message menu → Apps → Report Message. The submission acknowledgement is private.</p>
							</div>
							<ArrowRight className="flow-arrow" aria-hidden="true" />
							<div>
								<FileText size={24} aria-hidden="true" />
								<h3>2. Staff inspect</h3>
								<p>Review the saved excerpt and original message link in the configured staff channel.</p>
							</div>
							<ArrowRight className="flow-arrow" aria-hidden="true" />
							<div>
								<Check size={24} aria-hidden="true" />
								<h3>3. Staff decide</h3>
								<p>Choose Dismiss or Timeout 10 minutes. A successful moderation action is recorded separately.</p>
							</div>
						</div>
						<div className="handbook-pair">
							<div>
								<h3>Find a missing notification</h3>
								<GuideCommand command="/reports list" />
								<GuideCommand command="/reports view id:REPORT_ID" />
								<p>
									The saved inbox helps if the channel notification did not arrive. Report commands reply privately to authorized
									staff.
								</p>
							</div>
							<div>
								<h3>Review was interrupted?</h3>
								<p>
									Check whether the timeout already happened. An administrator can then use <code>/reports reset id:REPORT_ID</code>{' '}
									to reopen an interrupted review if appropriate.
								</p>
								<p>A report reference opens a report. Use the case reference for an action’s notes and reason history.</p>
							</div>
						</div>
					</Chapter>

					<Chapter id="automod" number="07" label="CATCH REPEATING PATTERNS" title="A helping hand, with an off switch.">
						<p className="chapter-lead">
							AutoMod is opt-in. Administrators choose which rules to enable. Start by observing normal chat, then enforce once the
							alerts match your community’s rules.
						</p>
						<div className="mode-comparison">
							<div>
								<span className="mode-dot" />
								<strong>Observe</strong>
								<p>Alerts staff. Does not block messages, delete them, or restrict joins.</p>
							</div>
							<ArrowRight aria-hidden="true" />
							<div>
								<span className="mode-dot enforce" />
								<strong>Enforce</strong>
								<p>Takes the rule’s specific action and alerts staff. The action depends on the rule.</p>
							</div>
						</div>
						<div className="automod-rules">
							<article>
								<div>
									<ShieldCheck size={20} aria-hidden="true" />
									<h3>Native presets</h3>
									<span>DISCORD HANDLES IT</span>
								</div>
								<p>
									Keywords, mention spam, and Discord’s generic spam detection. Use these for common message rules. Observe alerts;
									enforce blocks and alerts.
								</p>
								<GuideCommand command="/automod native preset:mentions mode:observe alert_channel:#staff-alerts mention_limit:5" />
								<p>
									Other presets are <code>keywords</code> and <code>spam</code>. Keyword rules accept a <code>keywords</code> list.
									Discord’s rule quotas and built-in exemptions apply.
								</p>
							</article>
							<article>
								<div>
									<Zap size={20} aria-hidden="true" />
									<h3>Flood & links</h3>
									<span>OPTIONAL BOT FEATURES</span>
								</div>
								<p>
									Catch repeated messages, bursts, blocked domains, or unwanted invites. Enforce deletes matching messages; it does
									not timeout the member or clear older messages.
								</p>
								<GuideCommand command="/automod flood mode:observe alert_channel:#staff-alerts threshold:6 duplicates:3 window:10" />
								<GuideCommand command="/automod links mode:observe alert_channel:#staff-alerts blocked_domains:example.com block_invites:true" />
								<p>
									Approved domains and specific invite codes can be allowed. The bot operator must enable Message Content access
									before these rules can be switched on.
								</p>
							</article>
							<article>
								<div>
									<Users size={20} aria-hidden="true" />
									<h3>Join bursts</h3>
									<span>EXTRA VERIFICATION</span>
								</div>
								<p>
									Use raid detection when many people join at once. Observe reports a burst; enforce temporarily raises server
									verification to Highest for affected unverified members.
								</p>
								<GuideCommand command="/automod raid mode:observe alert_channel:#staff-alerts threshold:10 window:10" />
								<p>
									The bot operator must enable Server Members access. Enforce uses a duration in seconds, for example{' '}
									<code>duration:600</code>. It does not ban, kick, or quarantine new members. Radon saves the previous verification
									setting for restoration.
								</p>
							</article>
						</div>
						<Question title="How do I tune or turn off a rule?">
							<p>
								Run the same rule command with <code>mode:enforce</code> when ready, or <code>mode:off</code> to disable it. Use{' '}
								<code>/automod remove</code> to delete a Radon native preset. <code>/automod status</code> shows your setup.
							</p>
							<p>
								Native presets have optional <code>exempt_roles</code> and <code>exempt_channels</code> fields. For custom message
								rules, use <code>/automod exemptions</code>. Raid joins are separate from message exemptions. Switching raid mode to
								off or observe restores an active restriction early.
							</p>
						</Question>
						<Note>
							Administrators and Radon need Manage Server to configure AutoMod. Custom deletion needs Manage Messages in the affected
							channels. Native rules run through Discord; custom detection depends on Radon being online. Automatic restoration can be
							delayed while the bot is offline.
						</Note>
					</Chapter>

					<Chapter id="locks" number="08" label="LOOK AFTER THE CONVERSATION" title="Slow it down. Or pause it.">
						<div className="handbook-pair">
							<div>
								<Timer size={23} className="chapter-icon" aria-hidden="true" />
								<h3>Slowmode: leave room to reply</h3>
								<p>Use it for a busy event or heated conversation when people should still be able to talk, just less frequently.</p>
								<GuideCommand command="/slowmode duration:10s reason:Give everyone room to reply" />
								<p>
									Use <code>duration:0</code> to turn it off. Slowmode sets the channel’s per-user posting interval.
								</p>
							</div>
							<div>
								<LockKeyhole size={23} className="chapter-icon" aria-hidden="true" />
								<h3>Lock: give a channel a break</h3>
								<p>Use it to pause activity for a role while staff catch up. Run the command, then complete the confirmation form.</p>
								<GuideCommand command="/lock text channel:#general" />
								<GuideCommand command="/unlock text channel:#general" />
								<p>Locks default to @everyone. Unlock with the same channel and role to restore the saved affected permissions.</p>
							</div>
						</div>
						<figure className="lock-visual">
							<figcaption>Optional timed lock · set the duration in the confirmation form</figcaption>
							<div>
								<span>
									<Settings2 size={20} aria-hidden="true" />
									<strong>Save permissions</strong>
								</span>
								<ArrowRight aria-hidden="true" />
								<span>
									<LockKeyhole size={20} aria-hidden="true" />
									<strong>Lock for 10m</strong>
								</span>
								<ArrowRight aria-hidden="true" />
								<span>
									<History size={20} aria-hidden="true" />
									<strong>Restore settings</strong>
								</span>
							</div>
						</figure>
						<Question title="What should I know about timed and wider locks?">
							<p>
								Leave the form’s duration empty for a manual lock, or choose 10 seconds to 28 days. A second lock does not extend the
								existing timer. A manual unlock removes the timer; saved schedules survive restarts, but restoration may happen late
								after downtime.
							</p>
							<p>
								Voice, thread, category, server, and bulk routes are available in <code>/lock</code> and <code>/unlock</code>. Bulk
								routes need administrator access. Restore a server lock with the same <code>deep</code> setting. Role and member
								overrides can still affect who can speak.
							</p>
							<p>
								Locks from before permission snapshots were introduced cannot be restored automatically. If unlock reports a skipped
								old lock, ask an administrator to restore its permissions manually.
							</p>
						</Question>
					</Chapter>

					<Chapter id="utilities" number="09" label="THE EVERYDAY BITS" title="A tidier server, a little less work.">
						<div className="utility-list">
							<div>
								<MessageSquare size={21} aria-hidden="true" />
								<div>
									<h3>Clean a chat</h3>
									<p>
										Use <code>/clear count:20</code> for recent messages. Optional <code>user</code> and <code>contains</code>{' '}
										filters target the cleanup. Pinned messages are skipped by default; check the result for messages Discord
										could not delete.
									</p>
								</div>
							</div>
							<div>
								<Users size={21} aria-hidden="true" />
								<div>
									<h3>Manage a member’s role</h3>
									<p>
										Use <code>/role add role:@Event target:@Member</code> or <code>/role remove</code>. Radon needs Manage Roles
										and a higher role position. Bulk role add/remove is currently unavailable.
									</p>
								</div>
							</div>
							<div>
								<Settings2 size={21} aria-hidden="true" />
								<div>
									<h3>Keep names readable</h3>
									<p>
										Use <code>/nick set target:@Member nickname:ReadableName</code> for a nickname change, or{' '}
										<code>/nick decancer</code> to simplify decorative characters. Nickname tools still need permissions and role
										access.
									</p>
								</div>
							</div>
							<div>
								<BookOpen size={21} aria-hidden="true" />
								<div>
									<h3>Post game coupons</h3>
									<p>
										Use <code>/claim post</code> for a coupon with a CLAIM button. The{' '}
										<Link href="/guide#staff">player guide’s staff section</Link> covers posting permissions, games, expiry, and
										optional alerts.
									</p>
								</div>
							</div>
						</div>
					</Chapter>

					<Chapter id="help" number="10" label="WHEN SOMETHING FEELS UNCLEAR" title="A few answers for the next time.">
						<Question title="Do we have to use every system?">
							<p>
								No. Use the tools your server needs. You can keep your warning workflow and never open a case command. Case records
								are created automatically for supported actions; their commands are optional review tools. AutoMod rules start off,
								and message reporting needs a configured staff channel.
							</p>
						</Question>
						<Question title="Why can’t I act on this member?">
							<p>
								Check your configured staff role, Discord command permissions, your highest role, Radon’s highest role, and the
								action’s bot permissions. You cannot target yourself or the server owner. Protected staff and equal or higher roles
								may also be excluded. Use <code>/help</code> in the same server and channel.
							</p>
						</Question>
						<Question title="A command failed. Should I just repeat it?">
							<p>
								Read its result first. Check the member, ban list, report state, or channel permissions when the outcome is uncertain.
								Failed automatic warning actions need staff review. For temporary bans, also check <code>/tempban list</code>. A saved
								recovery record helps staff investigate; it is not confirmation that the action completed.
							</p>
						</Question>
						<Question title="A case or log is missing. Where should I look?">
							<p>
								Cases do not import actions from before the feature or every action taken through Discord or other bots. Check that
								Radon performed a supported action successfully. A storage failure can leave a Discord log without a case; a log
								delivery failure can leave a saved case without a channel message. Try <code>/case history</code> for the member.
							</p>
						</Question>
						<Question title="Someone broke a rule, or Radon has a bug. Which report?">
							<p>
								For a member’s message, use Apps → Report Message. It goes to your server’s moderation team. For a problem with the
								bot, use <code>/bug</code>: read the warning, open the form, and describe how to reproduce the issue, what you
								expected, and what happened.
							</p>
							<p>
								Bot bug reports go privately to Radon’s owner, with one submission every ten minutes. Never include passwords, tokens,
								or private account codes. Spam, false reports, harassment, or other misuse will lead to a ban from using Radon.
							</p>
						</Question>
						<div className="handbook-next">
							<CircleHelp size={26} aria-hidden="true" />
							<div>
								<h3>Keep a little help close by.</h3>
								<p>
									<code>/help</code> shows available commands. <code>/guide topic:cases</code> explains cases in Discord.{' '}
									<code>/updates</code> shows recent changes.
								</p>
								<Link href="/updates" className="handbook-link">
									Read what’s new
									<ArrowRight size={15} aria-hidden="true" />
								</Link>
							</div>
						</div>
					</Chapter>
					<a href="#choose" className="handbook-link handbook-back-top">
						<ArrowDown size={15} aria-hidden="true" />
						Back to the tool finder
					</a>
				</div>
			</div>
		</div>
	);
}
