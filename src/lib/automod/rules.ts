import { createHash } from 'node:crypto';
import {
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleTriggerType,
	type AutoModerationRuleCreateOptions
} from 'discord.js';

export type Mode = 'off' | 'observe' | 'enforce';
export type NativePreset = 'keywords' | 'mentions' | 'spam';

export function parseIds(value: string, limit: number): string[] {
	const ids = [...new Set(value.split(/[\s,]+/).filter(Boolean))];
	if (ids.length > limit || ids.some((id) => !/^\d{17,20}$/.test(id))) throw new Error(`Enter up to ${limit} IDs separated by spaces or commas.`);
	return ids;
}

export function normalizeDomain(value: string): string {
	const input = value.trim().toLowerCase().replace(/\.$/, '');
	if (!input || /[\s/:@*?#\\]/.test(input)) throw new Error('Use domain names only, without URLs, paths, or wildcards.');
	const host = new URL(`https://${input}`).hostname;
	if (
		!host.includes('.') ||
		host.length > 253 ||
		host.split('.').some((label) => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
	)
		throw new Error('Enter a valid domain name.');
	return host;
}

export function parseDomains(value: string): string[] {
	const domains = [
		...new Set(
			value
				.split(/[\s,]+/)
				.filter(Boolean)
				.map(normalizeDomain)
		)
	];
	if (domains.length > 100) throw new Error('Use up to 100 domains.');
	return domains;
}

export function domainMatches(host: string, domain: string): boolean {
	return host === domain || host.endsWith(`.${domain}`);
}

export function parseInviteCodes(value: string): string[] {
	const codes = [...new Set(value.split(/[\s,]+/).filter(Boolean))];
	if (codes.length > 100 || codes.some((code) => !/^[A-Za-z0-9_-]{1,100}$/.test(code)))
		throw new Error('Use up to 100 invite codes without URLs. Invite codes are case-sensitive.');
	return codes;
}

export function hasBlockedLink(
	content: string,
	rules: { blockedDomains: string[]; allowedDomains: string[]; blockInvites: boolean; allowedInviteCodes?: string[] }
): boolean {
	const links = content.slice(0, 4000).match(/https?:\/\/[^\s<>]+|(?<![\w.-])(?:www\.)?discord(?:\.gg|(?:app)?\.com\/invite)\/[^\s<>]+/gi) ?? [];
	return links.some((link) => {
		try {
			const cleanLink = link.replace(/[),.!?;:\]}]+$/, '');
			const url = new URL(/^https?:\/\//i.test(cleanLink) ? cleanLink : `https://${cleanLink}`);
			const host = url.hostname.toLowerCase().replace(/\.$/, '');
			if (rules.allowedDomains.some((domain) => domainMatches(host, domain))) return false;
			let path = url.pathname;
			try {
				path = decodeURIComponent(path);
			} catch {
				/* Keep the original path for malformed escapes. */
			}
			const invite =
				domainMatches(host, 'discord.gg') ||
				((domainMatches(host, 'discord.com') || domainMatches(host, 'discordapp.com')) && /^\/invite\//i.test(path));
			const shortHost = host === 'discord.gg' || host === 'www.discord.gg';
			const longHost = [
				'discord.com',
				'www.discord.com',
				'canary.discord.com',
				'ptb.discord.com',
				'discordapp.com',
				'www.discordapp.com'
			].includes(host);
			const code = shortHost
				? /^\/([A-Za-z0-9_-]+)\/?$/.exec(path)?.[1]
				: longHost
					? /^\/invite\/([A-Za-z0-9_-]+)\/?$/i.exec(path)?.[1]
					: undefined;
			if (invite && code && rules.allowedInviteCodes?.includes(code)) return false;
			return (rules.blockInvites && invite) || rules.blockedDomains.some((domain) => domainMatches(host, domain));
		} catch {
			return false;
		}
	});
}

export function nativeRule(options: {
	preset: NativePreset;
	mode: Exclude<Mode, 'off'>;
	alertChannelId: string;
	words?: string;
	mentionLimit?: number;
	exemptRoles: string[];
	exemptChannels: string[];
}): AutoModerationRuleCreateOptions {
	const actions: AutoModerationRuleCreateOptions['actions'][number][] = [
		{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: options.alertChannelId } }
	];
	if (options.mode === 'enforce') actions.unshift({ type: AutoModerationActionType.BlockMessage });
	const preset = options.preset;
	const result: AutoModerationRuleCreateOptions = {
		name: `Radon: ${preset}`,
		eventType: AutoModerationRuleEventType.MessageSend,
		triggerType:
			preset === 'keywords'
				? AutoModerationRuleTriggerType.Keyword
				: preset === 'mentions'
					? AutoModerationRuleTriggerType.MentionSpam
					: AutoModerationRuleTriggerType.Spam,
		actions,
		enabled: true,
		exemptRoles: options.exemptRoles,
		exemptChannels: options.exemptChannels
	};
	if (preset === 'keywords') {
		const words = [
			...new Set(
				(options.words ?? '')
					.split(',')
					.map((word) => word.trim())
					.filter(Boolean)
			)
		];
		if (!words.length || words.length > 1000 || words.some((word) => word.length > 60))
			throw new Error('Provide comma-separated keywords, each 1–60 characters long.');
		result.triggerMetadata = { keywordFilter: words };
	} else if (preset === 'mentions') {
		const limit = options.mentionLimit ?? 5;
		if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('The mention limit must be between 1 and 50.');
		result.triggerMetadata = { mentionTotalLimit: limit, mentionRaidProtectionEnabled: true };
	}
	return result;
}

interface WindowEvent {
	id: string;
	at: number;
	channelId: string;
	fingerprint: string;
}

/** Fixed memory ceiling, per-user rolling windows, and no retained message bodies. */
export class FloodDetector {
	private readonly windows = new Map<string, WindowEvent[]>();
	public constructor(private readonly maxKeys = 10_000) {}

	public inspect(
		input: { guildId: string; userId: string; id: string; channelId: string; content: string; at: number },
		settings: { windowSeconds: number; floodThreshold: number; duplicateThreshold: number }
	): string[] {
		const key = `${input.guildId}:${input.userId}`;
		const window = (this.windows.get(key) ?? []).filter((event) => event.at > input.at - settings.windowSeconds * 1000);
		if (window.some((event) => event.id === input.id)) return [];
		const fingerprint = createHash('sha256').update(input.content.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')).digest('hex');
		window.push({ id: input.id, at: input.at, channelId: input.channelId, fingerprint });
		// Only the most recent threshold-sized history is needed to detect repeated breaches.
		const bounded = window.slice(-Math.max(settings.floodThreshold, settings.duplicateThreshold));
		this.windows.delete(key);
		this.windows.set(key, bounded);
		while (this.windows.size > this.maxKeys) this.windows.delete(this.windows.keys().next().value!);
		const duplicates = bounded.filter((event) => event.fingerprint === fingerprint);
		const reasons: string[] = [];
		if (bounded.length >= settings.floodThreshold) reasons.push('message flood');
		if (input.content.trim() && duplicates.length >= settings.duplicateThreshold) {
			reasons.push(new Set(duplicates.map((event) => event.channelId)).size > 1 ? 'cross-channel duplicate messages' : 'duplicate messages');
		}
		return reasons;
	}

	public sweep(now: number) {
		for (const [key, events] of this.windows) if (!events.length || events[events.length - 1].at <= now - 60_000) this.windows.delete(key);
	}
	public get size() {
		return this.windows.size;
	}
}

export class BurstDetector {
	private readonly windows = new Map<string, number[]>();
	public inspect(guildId: string, now: number, threshold: number, windowSeconds: number): boolean {
		const times = (this.windows.get(guildId) ?? []).filter((at) => at > now - windowSeconds * 1000);
		times.push(now);
		this.windows.delete(guildId);
		this.windows.set(guildId, times.slice(-threshold));
		while (this.windows.size > 2000) this.windows.delete(this.windows.keys().next().value!);
		return times.length >= threshold;
	}
	public sweep(now: number) {
		for (const [key, times] of this.windows) if (!times.length || times[times.length - 1] <= now - 60_000) this.windows.delete(key);
	}
}
