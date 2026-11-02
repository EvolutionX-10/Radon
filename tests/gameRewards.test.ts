import { describe, expect, it } from 'bun:test';
import { accountOwnerKey, games, getGame } from '../src/lib/redemption/games.js';
import { makeNetmarbleAdapter, receiptKey } from '../src/lib/redemption/service.js';
import { claimButtonId, parseClaimButton } from '../src/lib/redemption/posts.js';
import { guideContent, guideTopics, guideContainer } from '../src/lib/redemption/guide.js';
import { postListingStats, startListingReporter, stopListingReporter } from '../src/lib/rewards/listings.js';
import { rewardButtons, rewardSummary } from '../src/lib/rewards/presentation.js';
import { EventEmitter } from 'node:events';
import type { Client } from 'discord.js';
import { LISTED_BOT_ID } from '../src/lib/rewards/service.js';
import { sendCouponAlert } from '../src/lib/rewards/alerts.js';

describe('game compatibility', () => {
	it('leaves Solo Leveling account IDs and labels untouched and isolates other games', () => {
		expect(accountOwnerKey('123')).toBe('123');
		expect(accountOwnerKey('123', 'sololv')).toBe('123');
		expect(new Set(games.map((game) => accountOwnerKey('123', game.id))).size).toBe(3);
		expect(new Set(games.map((game) => receiptKey(game.id, 'account', 'SAME'))).size).toBe(3);
		expect(() => getGame('unknown')).toThrow();
	});
	it('roundtrips new game buttons within Discord limits and keeps both legacy formats working', () => {
		for (const game of games) {
			const code = 'A'.repeat(64);
			const expires = Date.now() + 60_000;
			const id = claimButtonId(game.id, code, expires);
			expect(id.length).toBeLessThanOrEqual(100);
			expect(parseClaimButton(id)?.code).toBe(code);
			expect(parseClaimButton(id, expires)?.expired).toBe(true);
			expect(parseClaimButton(id)?.game ?? 'sololv').toBe(game.id);
		}
		expect(parseClaimButton('code-OLD')).toEqual({ code: 'OLD', expired: false });
		expect(parseClaimButton('redeem:0:OLD')).toEqual({ code: 'OLD', expired: false });
		expect(parseClaimButton('redeem:unknown:0:CODE')).toBeNull();
		expect(() => claimButtonId('sololv', '@everyone')).toThrow();
	});
	it('uses the publisher’s game-specific payload without weakening Solo Leveling validation', async () => {
		for (const game of games) {
			let payload: unknown;
			const adapter = makeNetmarbleAdapter(
				(async (_url, init) => {
					payload = JSON.parse(String(init?.body));
					return Response.json({ success: true, errorCode: 200 });
				}) as typeof fetch,
				game.id
			);
			expect((await adapter.redeem('CODE', { memberCode: 'A'.repeat(32) }, AbortSignal.timeout(100))).status).toBe('success');
			expect(payload).toEqual({ gameCode: game.id, couponCode: 'CODE', langCd: 'EN_US', pid: 'A'.repeat(32) });
		}
		expect(makeNetmarbleAdapter().validateAccount('short')).toBe(false);
		expect(makeNetmarbleAdapter(fetch, 'tskgb').validateAccount('valid-member')).toBe(true);
		expect(makeNetmarbleAdapter(fetch, 'nanarise').validateAccount('password@email.com')).toBe(false);
	});
});

describe('guides and optional voting', () => {
	it('does not send a private-channel coupon after the recipient loses access or leaves', async () => {
		let sent = 0;
		for (const allowed of [false, true]) {
			const client = {
				guilds: {
					cache: new Map([
						[
							'guild',
							{
								available: true,
								members: {
									fetch: async (options: any) => {
										expect(options).toEqual({ user: '123', force: true });
										return {
											send: async () => {
												sent++;
											}
										};
									}
								},
								channels: { fetch: async () => ({ permissionsFor: () => ({ has: () => allowed }) }) }
							}
						]
					])
				}
			} as unknown as Client;
			await sendCouponAlert(
				client,
				'123',
				{ content: 'CODE', components: [], allowedMentions: { parse: [] } },
				{ guildId: 'guild', channelId: 'channel' }
			);
			expect(sent).toBe(allowed ? 1 : 0);
		}
		await sendCouponAlert(
			{ guilds: { cache: new Map() } } as unknown as Client,
			'123',
			{ content: 'CODE', components: [], allowedMentions: { parse: [] } },
			{ guildId: 'guild', channelId: 'channel' }
		);
		expect(sent).toBe(1);
	});
	it('fits every guide and full reward summary in Discord text limits', () => {
		for (const topic of guideTopics) {
			expect(guideContent(topic).length).toBeLessThanOrEqual(2_000);
			expect(guideContent(topic).length).toBeGreaterThan(100);
		}
		expect(
			guideContainer()
				.toJSON()
				.components.filter((component) => component.type === 1)
		).toHaveLength(2);
		expect(
			rewardSummary(Date.now() + 1_000, [
				{ provider: 'topgg', status: 'verified' },
				{ provider: 'dbl', status: 'unavailable' }
			]).length
		).toBeLessThanOrEqual(2_000);
		const buttons = rewardButtons().toJSON().components;
		expect(buttons).toHaveLength(3);
		expect(JSON.stringify(buttons)).not.toContain('voidbots');
		expect(guideContent('rewards')).toContain('either');
	});
});

describe('listing statistics', () => {
	it('posts actual counts with each provider’s field names and isolates a failed provider', async () => {
		const requests: { url: string; body: unknown }[] = [];
		const results = await postListingStats('123', 89, { topgg: 'test-token', dbl: 'test-token' }, (async (url, init) => {
			requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
			return new Response('', { status: String(url).includes('top.gg') ? 401 : 200 });
		}) as typeof fetch);
		expect(requests.map((request) => request.body)).toEqual([{ server_count: 89 }, { guilds: 89 }]);
		expect(results.map((result) => result.status)).toEqual(['failed', 'posted']);
	});
	it('skips missing tokens instead of sending unauthenticated requests and rejects invalid counts', async () => {
		let calls = 0;
		const fetcher = (async () => {
			calls++;
			return new Response();
		}) as typeof fetch;
		expect((await postListingStats('123', 0, {}, fetcher)).every((result) => result.status === 'unconfigured')).toBe(true);
		await expect(postListingStats('123', NaN, {}, fetcher)).rejects.toThrow();
		expect(calls).toBe(0);
	});
	it('never starts reporting for development bots or non-leading shards', () => {
		const nodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		try {
			for (const config of [{ user: { id: 'dev' } }, { user: { id: LISTED_BOT_ID }, shard: { ids: [1] } }]) {
				const client = Object.assign(new EventEmitter(), config) as unknown as Client;
				startListingReporter(client);
				expect(client.listenerCount('guildCreate')).toBe(0);
				stopListingReporter(client);
			}
		} finally {
			process.env.NODE_ENV = nodeEnv;
		}
	});
});
