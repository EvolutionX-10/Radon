import { describe, expect, it } from 'bun:test';
import { AutoModerationActionType, AutoModerationRuleTriggerType } from 'discord.js';
import {
	BurstDetector,
	FloodDetector,
	domainMatches,
	hasBlockedLink,
	nativeRule,
	normalizeDomain,
	parseDomains,
	parseIds,
	parseInviteCodes
} from '../src/lib/automod/rules.js';

const base = { mode: 'observe' as const, alertChannelId: '123456789012345678', exemptRoles: [], exemptChannels: [] };

describe('native AutoMod presets', () => {
	it('observes without deleting or blocking and always supplies an alert', () => {
		const rule = nativeRule({ ...base, preset: 'mentions', mentionLimit: 7 });
		expect(rule.triggerType).toBe(AutoModerationRuleTriggerType.MentionSpam);
		expect(rule.triggerMetadata?.mentionTotalLimit).toBe(7);
		expect(rule.actions.map((action) => action.type)).toEqual([AutoModerationActionType.SendAlertMessage]);
	});
	it('enforces with a block and alert, forwards exemptions and deduplicates keywords', () => {
		const rule = nativeRule({
			...base,
			preset: 'keywords',
			mode: 'enforce',
			words: 'scam*, scam*, bad phrase',
			exemptRoles: ['role'],
			exemptChannels: ['channel']
		});
		expect(rule.actions.map((action) => action.type)).toEqual([AutoModerationActionType.BlockMessage, AutoModerationActionType.SendAlertMessage]);
		expect(rule.triggerMetadata?.keywordFilter).toEqual(['scam*', 'bad phrase']);
		expect(rule.exemptRoles).toEqual(['role']);
		expect(rule.exemptChannels).toEqual(['channel']);
	});
	it('validates keyword and mention limits before calling Discord', () => {
		expect(() => nativeRule({ ...base, preset: 'keywords', words: '' })).toThrow();
		expect(() => nativeRule({ ...base, preset: 'keywords', words: 'x'.repeat(61) })).toThrow();
		expect(() => nativeRule({ ...base, preset: 'mentions', mentionLimit: 51 })).toThrow();
		expect(nativeRule({ ...base, preset: 'spam' }).triggerMetadata).toBeUndefined();
	});
});

describe('domain and invite controls', () => {
	it('allows approved invite codes case-sensitively on canonical Discord hosts only', () => {
		const policy = { blockedDomains: ['evil.example'], allowedDomains: [], blockInvites: true, allowedInviteCodes: ['AbC123'] };
		expect(hasBlockedLink('https://discord.gg/AbC123', policy)).toBe(false);
		expect(hasBlockedLink('https://discord.com/invite/AbC123?event=1', policy)).toBe(false);
		expect(hasBlockedLink('https://discord.gg/abc123', policy)).toBe(true);
		expect(hasBlockedLink('https://discord.gg/Other', policy)).toBe(true);
		expect(hasBlockedLink('https://unrecognized.discord.gg/AbC123', policy)).toBe(true);
		expect(hasBlockedLink('https://discord.gg.evil.example/AbC123', policy)).toBe(true);
		expect(hasBlockedLink('https://evil.example/invite/AbC123', policy)).toBe(true);
		expect(parseInviteCodes('AbC123,AbC123 abc123')).toEqual(['AbC123', 'abc123']);
		expect(() => parseInviteCodes('https://discord.gg/AbC123')).toThrow();
	});
	const rules = { blockedDomains: ['evil.example'], allowedDomains: ['safe.evil.example'], blockInvites: true };
	it('uses DNS label boundaries, normalized hosts, and explicit exceptions', () => {
		expect(domainMatches('notexample.com', 'example.com')).toBe(false);
		expect(hasBlockedLink('https://EVIL.example/path', rules)).toBe(true);
		expect(hasBlockedLink('https://sub.evil.example/path', rules)).toBe(true);
		expect(hasBlockedLink('https://evil.example.safe.com/path', rules)).toBe(false);
		expect(hasBlockedLink('https://safe.evil.example/path', rules)).toBe(false);
		expect(hasBlockedLink('https://evil.example@safe.com/path', rules)).toBe(false);
		expect(hasBlockedLink('[click](https://evil.example)', rules)).toBe(true);
	});
	it('handles Discord invite formats and does not match lookalike domains', () => {
		expect(hasBlockedLink('discord.gg/invite-code', rules)).toBe(true);
		expect(hasBlockedLink('https://www.discord.gg/invite-code', rules)).toBe(true);
		expect(hasBlockedLink('https://discordapp.com/invite/code', rules)).toBe(true);
		expect(hasBlockedLink('https://discord.com/invite/code', rules)).toBe(true);
		expect(hasBlockedLink('https://discord.com/%69nvite/code', rules)).toBe(true);
		expect(hasBlockedLink('https://notdiscord.gg/code', rules)).toBe(false);
		expect(hasBlockedLink('notdiscord.gg/code', rules)).toBe(false);
		expect(hasBlockedLink('https://discord.com/channels/1', rules)).toBe(false);
	});
	it('rejects URLs and malformed domain configuration', () => {
		expect(normalizeDomain('BÜCHER.example.')).toBe('xn--bcher-kva.example');
		expect(parseDomains('a.example, a.example b.example')).toEqual(['a.example', 'b.example']);
		for (const value of ['https://example.com', '*.example.com', 'x@example.com', 'example.com/path', '-bad.example', 'x..example'])
			expect(() => normalizeDomain(value)).toThrow();
	});
	it('bounds and deduplicates exemption lists', () => {
		expect(parseIds('123456789012345678, 123456789012345678', 20)).toEqual(['123456789012345678']);
		expect(() => parseIds('@everyone', 20)).toThrow();
		expect(() => parseIds('123456789012345678 223456789012345678', 1)).toThrow();
	});
});

describe('rolling flood detection', () => {
	const settings = { windowSeconds: 10, floodThreshold: 6, duplicateThreshold: 3 };
	const message = { guildId: 'guild', userId: 'user', channelId: 'one', content: 'repeat', at: 1000, id: '1' };
	it('detects cross-channel duplicates and ignores repeated gateway IDs', () => {
		const detector = new FloodDetector();
		expect(detector.inspect(message, settings)).toEqual([]);
		expect(detector.inspect(message, settings)).toEqual([]);
		expect(detector.inspect({ ...message, id: '2', content: ' REPEAT ' }, settings)).toEqual([]);
		expect(detector.inspect({ ...message, id: '3', channelId: 'two' }, settings)).toEqual(['cross-channel duplicate messages']);
	});
	it('counts unique messages, expires windows, and isolates users and guilds', () => {
		const detector = new FloodDetector();
		for (let i = 0; i < 5; i++) expect(detector.inspect({ ...message, id: String(i), content: String(i) }, settings)).toEqual([]);
		expect(detector.inspect({ ...message, id: '6', content: 'six' }, settings)).toEqual(['message flood']);
		expect(detector.inspect({ ...message, id: '7', at: 11_001 }, settings)).toEqual([]);
		expect(detector.inspect({ ...message, guildId: 'other', id: '8' }, settings)).toEqual([]);
		expect(detector.inspect({ ...message, userId: 'other', id: '9' }, settings)).toEqual([]);
	});
	it('has a fixed key ceiling and releases inactive windows', () => {
		const detector = new FloodDetector(2);
		for (let i = 0; i < 100; i++) detector.inspect({ ...message, userId: String(i) }, settings);
		expect(detector.size).toBe(2);
		detector.sweep(62_000);
		expect(detector.size).toBe(0);
	});
	it('detects join bursts within one guild and expires the burst', () => {
		const detector = new BurstDetector();
		expect(detector.inspect('one', 1000, 3, 10)).toBe(false);
		expect(detector.inspect('one', 2000, 3, 10)).toBe(false);
		expect(detector.inspect('two', 3000, 3, 10)).toBe(false);
		expect(detector.inspect('one', 3000, 3, 10)).toBe(true);
		expect(detector.inspect('one', 14000, 3, 10)).toBe(false);
	});
});
