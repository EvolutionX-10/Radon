import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { accountLimit, grantLegacyPass, grantPass, PASS_MS, supporterUntil, VoteService } from '../src/lib/rewards/service.js';
import { saveMemberCode } from '../src/lib/redemption/persistence.js';
import { accountOwnerKey } from '../src/lib/redemption/games.js';
import { subscribeCoupons, deliverCouponAlerts } from '../src/lib/rewards/alerts.js';

// Never infer a database from MONGO or a production variable.
const testUrl = process.env.RADON_REWARDS_TEST_MONGO;
if (testUrl) {
	const url = new URL(testUrl);
	if (
		url.protocol !== 'mongodb:' ||
		!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
		!/^\/radon_test_[a-z0-9_]+$/i.test(url.pathname) ||
		url.username ||
		url.password
	)
		throw new Error('RADON_REWARDS_TEST_MONGO must select an unauthenticated localhost radon_test_* database.');
}
const suite = testUrl ? describe : describe.skip;
suite('vote rewards and alert outbox against disposable MongoDB', () => {
	let prisma: PrismaClient;
	beforeAll(() => {
		prisma = new PrismaClient({ datasources: { db: { url: testUrl! } } });
	});
	beforeEach(async () => {
		await Promise.all([
			prisma.supporterPass.deleteMany({}),
			prisma.redemptionReceipt.deleteMany({}),
			prisma.memberCodes.deleteMany({}),
			prisma.couponSubscription.deleteMany({}),
			prisma.couponAlert.deleteMany({})
		]);
	});
	afterAll(async () => {
		await prisma?.$disconnect();
	});
	it('concurrent duplicate and out-of-order vote evidence keeps exactly one fixed, latest expiry', async () => {
		const now = Date.now();
		const evidence = [now - 10_000, now - 5_000, now - 20_000];
		await Promise.all(
			Array.from({ length: 25 }, (_, index) => grantPass(prisma, '123', { provider: 'topgg', votedAt: evidence[index % 3] }, now))
		);
		expect(await prisma.supporterPass.count()).toBe(1);
		expect(await supporterUntil(prisma, '123', now)).toBe(now - 5_000 + PASS_MS);
		await grantPass(prisma, '123', { provider: 'topgg', votedAt: now - 20_000 }, now + 1_000);
		expect(await supporterUntil(prisma, '123', now)).toBe(now - 5_000 + PASS_MS);
		await expect(grantPass(prisma, '123', { provider: 'dbl', votedAt: now + 1 }, now)).rejects.toThrow();
	});
	it('legacy boolean checks grant once and cannot slide or stack an active pass', async () => {
		const now = Date.now();
		await Promise.all(Array.from({ length: 20 }, () => grantLegacyPass(prisma, '123', now)));
		await grantLegacyPass(prisma, '123', now + 60_000);
		expect(await supporterUntil(prisma, '123', now)).toBe(now + PASS_MS);
		await grantLegacyPass(prisma, '123', now + PASS_MS + 1);
		expect(await supporterUntil(prisma, '123', now + PASS_MS + 1)).toBe(now + 2 * PASS_MS + 1);
	});
	it('keeps free and supporter account limits atomic, isolated per game, and preserves saved extras after expiry', async () => {
		await grantPass(prisma, '123', { provider: 'dbl', votedAt: Date.now() });
		expect(await accountLimit(prisma, '123')).toBe(10);
		const owner = accountOwnerKey('123', 'tskgb');
		await Promise.allSettled(Array.from({ length: 30 }, (_, index) => saveMemberCode(prisma, owner, String(index), undefined, 10)));
		expect((await prisma.memberCodes.findUniqueOrThrow({ where: { id: owner } })).memberCodes).toHaveLength(10);
		expect(await prisma.memberCodes.findUnique({ where: { id: '123' } })).toBeNull();
		await prisma.supporterPass.updateMany({ data: { expiresAt: new Date(0) } });
		expect(await accountLimit(prisma, '123')).toBe(5);
		expect((await prisma.memberCodes.findUniqueOrThrow({ where: { id: owner } })).memberCodes).toHaveLength(10);
	});
	it('verifies Top.gg v1 from trusted timestamps and never grants for malformed or future data', async () => {
		for (const body of [
			{ created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString() },
			{ created_at: new Date(Date.now() + 60_000).toISOString(), expires_at: new Date(Date.now() + 120_000).toISOString() },
			{ voted: 1 }
		]) {
			await prisma.redemptionReceipt.deleteMany({});
			await prisma.supporterPass.deleteMany({});
			const service = new VoteService(prisma, { botId: '999', topggToken: 'test' }, (async (url, init) => {
				expect(String(url)).toContain('/projects/@me/votes/123?source=discord');
				expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test');
				return Response.json(body);
			}) as typeof fetch);
			const result = await service.check('123');
			expect(await prisma.supporterPass.count()).toBe(result[0].status === 'verified' ? 1 : 0);
			expect(result[0].status).toBe('expires_at' in body && Date.parse(body.created_at) <= Date.now() ? 'verified' : 'unavailable');
		}
	});
	it('falls back for existing Top.gg tokens, rate limits repeated checks, and reports missing DBL setup', async () => {
		let calls = 0;
		const service = new VoteService(prisma, { botId: '999', topggToken: 'test' }, (async (url) => {
			calls++;
			return String(url).includes('/api/v1/') ? new Response('', { status: 401 }) : Response.json({ voted: 1 });
		}) as typeof fetch);
		expect((await service.check('123')).map((result) => result.status)).toEqual(['verified', 'unconfigured']);
		await expect(service.check('123')).rejects.toThrow('30 seconds');
		expect(calls).toBe(2);
		expect(await accountLimit(prisma, '123')).toBe(10);
	});
	it('coalesces DBL vote downloads and isolates a failed Top.gg service', async () => {
		let calls = 0;
		const stamp = new Date(Date.now() - 1000).toISOString();
		const service = new VoteService(prisma, { botId: '999', topggToken: 'test', dblToken: 'test' }, (async (url) => {
			calls++;
			if (String(url).includes('top.gg')) return new Response('', { status: 503 });
			return Response.json({
				upvotes: [
					{ user_id: '123', timestamp: stamp },
					{ user_id: '456', timestamp: stamp }
				]
			});
		}) as typeof fetch);
		const results = await Promise.all([service.check('123'), service.check('456')]);
		expect(results.every((result) => result[1].status === 'verified')).toBe(true);
		expect(results[0][0].status).toBe('unavailable');
		expect(calls).toBe(2);
		expect(await supporterUntil(prisma, '123')).toBe(Date.parse(stamp) + PASS_MS);
	});
	it('publisher/API outages never revoke an existing pass', async () => {
		await grantLegacyPass(prisma, '123');
		const before = await supporterUntil(prisma, '123');
		const service = new VoteService(
			prisma,
			{ botId: '999', topggToken: 'test' },
			(async () => new Response('', { status: 429 })) as typeof fetch
		);
		expect((await service.check('123'))[0].status).toBe('unavailable');
		expect(await supporterUntil(prisma, '123')).toBe(before);
	});

	async function alertFixture() {
		await subscribeCoupons(prisma, '123', 'guild', 'sololv', true);
		await subscribeCoupons(prisma, '456', 'guild', 'sololv', true);
		await subscribeCoupons(prisma, '789', 'another-guild', 'sololv', true);
		await subscribeCoupons(prisma, '777', 'guild', 'tskgb', true);
		await Promise.all(['123', '789', '777'].map((user) => grantLegacyPass(prisma, user)));
		return prisma.couponAlert.create({
			data: {
				id: 'post',
				guildId: 'guild',
				channelId: 'channel',
				game: 'sololv',
				code: 'CODE',
				messageUrl: 'https://discord.com/channels/guild/channel/post',
				cursor: '',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 60_000)
			}
		});
	}
	it('delivers only to matching opt-in supporters, claims once across workers, and deduplicates reposts', async () => {
		const post = await alertFixture();
		const sent: string[] = [];
		const send = async (user: string) => {
			sent.push(user);
		};
		await Promise.all([deliverCouponAlerts(prisma, send), deliverCouponAlerts(prisma, send)]);
		expect(sent).toEqual(['123']);
		await prisma.couponAlert.create({ data: { ...post, id: 'repost', leaseToken: null, leaseUntil: null } });
		await deliverCouponAlerts(prisma, send);
		expect(sent).toEqual(['123']);
	});
	it('does not send expired coupons, disabled subscriptions, or replay closed DMs', async () => {
		await alertFixture();
		await subscribeCoupons(prisma, '123', 'guild', 'sololv', false);
		let attempts = 0;
		await deliverCouponAlerts(prisma, async () => {
			attempts++;
		});
		expect(attempts).toBe(0);
		await alertFixture();
		await deliverCouponAlerts(prisma, async () => {
			attempts++;
			throw new Error('Closed DMs');
		});
		await deliverCouponAlerts(prisma, async () => {
			attempts++;
		});
		expect(attempts).toBe(1);
		await alertFixture();
		await prisma.couponAlert.updateMany({ data: { expiresAt: new Date(0) } });
		await deliverCouponAlerts(prisma, async () => {
			attempts++;
		});
		expect(attempts).toBe(1);
	});
	it('recovers an expired worker lease and resumes after the first page without skipping subscribers', async () => {
		const post = await alertFixture();
		await prisma.couponSubscription.deleteMany({});
		const users = Array.from({ length: 30 }, (_, index) => String(1000 + index));
		await Promise.all(
			users.map(async (user) => {
				await grantLegacyPass(prisma, user);
				await prisma.couponSubscription.create({
					data: {
						id: `guild:sololv:${user}`,
						userId: user,
						guildId: 'guild',
						game: 'sololv',
						enabled: true,
						createdAt: new Date(post.createdAt.getTime() - 1)
					}
				});
			})
		);
		await prisma.couponAlert.update({ where: { id: post.id }, data: { leaseToken: 'other-worker', leaseUntil: new Date(Date.now() + 60_000) } });
		const sent: string[] = [];
		const send = async (user: string) => {
			sent.push(user);
		};
		await deliverCouponAlerts(prisma, send);
		expect(sent).toHaveLength(0);
		await prisma.couponAlert.update({ where: { id: post.id }, data: { leaseUntil: new Date(0) } });
		await deliverCouponAlerts(prisma, send);
		expect(sent).toHaveLength(25);
		expect((await prisma.couponAlert.findUniqueOrThrow({ where: { id: post.id } })).cursor).toBe('guild:sololv:1024');
		await deliverCouponAlerts(prisma, send);
		expect(sent).toHaveLength(30);
		expect(new Set(sent).size).toBe(30);
		expect(await prisma.couponAlert.count()).toBe(0);
	});
});
