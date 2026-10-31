import type { PrismaClient } from '@prisma/client';
import { PrismaReceipts } from '../redemption/persistence.js';

export const LISTED_BOT_ID = '944833303226236989';
export const PASS_MS = 24 * 60 * 60_000;
export const BASE_ACCOUNTS = 5;
export const SUPPORTER_ACCOUNTS = 10;
export type VoteProvider = 'topgg' | 'dbl';
export interface VoteEvidence {
	provider: VoteProvider;
	votedAt: number;
}
export type VoteCheck = { provider: VoteProvider; status: 'verified' | 'not_found' | 'unavailable' | 'unconfigured' };

export async function supporterUntil(prisma: PrismaClient, userId: string, now = Date.now()): Promise<number> {
	const passes = await prisma.supporterPass.findMany({ where: { userId, expiresAt: { gt: new Date(now) } } });
	return Math.max(0, ...passes.map((pass) => pass.expiresAt.getTime()));
}
export async function accountLimit(prisma: PrismaClient, userId: string) {
	// Listing failures and missing setup must never prevent free redemption.
	try {
		return (await supporterUntil(prisma, userId)) ? SUPPORTER_ACCOUNTS : BASE_ACCOUNTS;
	} catch {
		return BASE_ACCOUNTS;
	}
}
export async function grantPass(prisma: PrismaClient, userId: string, evidence: VoteEvidence, now = Date.now()) {
	if (!Number.isFinite(evidence.votedAt) || evidence.votedAt > now || evidence.votedAt <= now - PASS_MS) throw new Error('Invalid vote timestamp');
	const expiresAt = new Date(evidence.votedAt + PASS_MS);
	const command = {
		findAndModify: 'supporterPass',
		query: { _id: `${evidence.provider}:${userId}` },
		upsert: true,
		update: { $set: { userId, provider: evidence.provider }, $max: { expiresAt: { $date: expiresAt.toISOString() } } }
	};
	let result;
	try {
		result = await prisma.$runCommandRaw(command);
	} catch (error) {
		if (!duplicateWrite(error)) throw error;
		result = await prisma.$runCommandRaw({ ...command, upsert: false });
	}
	if (result.ok !== 1 || result.writeConcernError || (Array.isArray(result.writeErrors) && result.writeErrors.length))
		throw new Error('Vote reward could not be saved');
}
function duplicateWrite(error: unknown) {
	if (!error || typeof error !== 'object' || !('code' in error)) return false;
	return (
		error.code === 'P2002' ||
		('meta' in error && !!error.meta && typeof error.meta === 'object' && 'code' in error.meta && String(error.meta.code) === '11000')
	);
}

/** The legacy API exposes a boolean, not a vote timestamp. Grant once per pass,
 * atomically, so repeated checks cannot slide its expiry forward. */
export async function grantLegacyPass(prisma: PrismaClient, userId: string, now = Date.now()) {
	const id = `topgg:${userId}`;
	const current = await prisma.supporterPass.findUnique({ where: { id } });
	if (current && current.expiresAt.getTime() > now) return;
	if (!current) {
		try {
			await prisma.supporterPass.create({ data: { id, userId, provider: 'topgg', expiresAt: new Date(now + PASS_MS) } });
			return;
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return;
			throw error;
		}
	}
	const result = await prisma.$runCommandRaw({
		findAndModify: 'supporterPass',
		query: { _id: id, expiresAt: { $lte: { $date: new Date(now).toISOString() } } },
		update: { $set: { expiresAt: { $date: new Date(now + PASS_MS).toISOString() } } }
	});
	if (result.ok !== 1 || result.writeConcernError) throw new Error('Vote reward could not be saved');
}

export interface VoteConfig {
	botId: string;
	topggToken?: string;
	dblToken?: string;
}
export class VoteService {
	private legacyTopgg = false;
	private dblCache?: { until: number; votes: { user_id: string; timestamp: string }[] };
	private dblPending?: Promise<{ user_id: string; timestamp: string }[]>;
	public constructor(
		private readonly prisma: PrismaClient,
		private readonly config: VoteConfig,
		private readonly fetcher: typeof fetch = fetch
	) {}
	private async request(provider: VoteProvider, url: string, authorization: string) {
		const receipts = new PrismaReceipts(this.prisma);
		if ((await receipts.reserve(`votes:request:${provider}`, 1_100)).kind !== 'acquired') throw new Error('Vote verification busy');
		const response = await this.fetcher(url, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(3_000) });
		if (response.status === 429) await receipts.block(`votes:request:${provider}`, 60_000);
		return response;
	}
	private async topgg(userId: string) {
		const token = this.config.topggToken!;
		let fallbackSlot = false;
		if (!this.legacyTopgg) {
			const response = await this.request('topgg', `https://top.gg/api/v1/projects/@me/votes/${userId}?source=discord`, `Bearer ${token}`);
			if (response.status === 404) return false;
			if (response.status === 401 || response.status === 403) {
				this.legacyTopgg = true;
				fallbackSlot = true;
			} else {
				if (!response.ok) throw new Error('Vote verification unavailable');
				const data = (await response.json()) as { created_at?: unknown; expires_at?: unknown };
				if (typeof data.created_at !== 'string' || typeof data.expires_at !== 'string') throw new Error('Invalid vote response');
				if (!(Date.parse(data.expires_at) > Date.now())) return false;
				await grantPass(this.prisma, userId, { provider: 'topgg', votedAt: Date.parse(data.created_at) });
				return true;
			}
			// Reuse the same rate slot for this compatibility fallback (two bounded requests).
		}
		const legacyUrl = `https://top.gg/api/bots/${this.config.botId}/check?userId=${userId}`;
		const response = fallbackSlot
			? await this.fetcher(legacyUrl, { headers: { Authorization: token }, signal: AbortSignal.timeout(3_000) })
			: await this.request('topgg', legacyUrl, token);
		if (response.status === 429) await new PrismaReceipts(this.prisma).block('votes:request:topgg', 60_000);
		if (!response.ok) throw new Error('Vote verification unavailable');
		const data = (await response.json()) as { voted?: unknown };
		if (data.voted !== 0 && data.voted !== 1) throw new Error('Invalid vote response');
		if (!data.voted) return false;
		await grantLegacyPass(this.prisma, userId);
		return true;
	}
	private async dblVotes() {
		if (this.dblCache && this.dblCache.until > Date.now()) return this.dblCache.votes;
		if (this.dblPending) return this.dblPending;
		this.dblPending = (async () => {
			const response = await this.request('dbl', `https://discordbotlist.com/api/v1/bots/${this.config.botId}/upvotes`, this.config.dblToken!);
			if (!response.ok) throw new Error('Vote verification unavailable');
			const data = (await response.json()) as { upvotes?: unknown };
			if (!Array.isArray(data.upvotes)) throw new Error('Invalid vote response');
			const votes = data.upvotes.filter(
				(vote): vote is { user_id: string; timestamp: string } =>
					!!vote && typeof vote === 'object' && typeof vote.user_id === 'string' && typeof vote.timestamp === 'string'
			);
			this.dblCache = { until: Date.now() + 60_000, votes };
			return votes;
		})();
		try {
			return await this.dblPending;
		} finally {
			this.dblPending = undefined;
		}
	}
	public async check(userId: string): Promise<VoteCheck[]> {
		if (!/^\d{1,25}$/.test(userId)) throw new Error('Invalid Discord user');
		if ((await new PrismaReceipts(this.prisma).reserve(`votes:user:${userId}`, 30_000)).kind !== 'acquired')
			throw new Error('Please wait 30 seconds between vote checks. Your current perks stay active.');
		return Promise.all(
			(['topgg', 'dbl'] as const).map(async (provider): Promise<VoteCheck> => {
				if (!(provider === 'topgg' ? this.config.topggToken : this.config.dblToken)) return { provider, status: 'unconfigured' };
				try {
					let verified = false;
					if (provider === 'topgg') verified = await this.topgg(userId);
					else {
						const vote = (await this.dblVotes())
							.filter((vote) => vote.user_id === userId)
							.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
						if (vote && Date.parse(vote.timestamp) > Date.now() - PASS_MS) {
							await grantPass(this.prisma, userId, { provider, votedAt: Date.parse(vote.timestamp) });
							verified = true;
						}
					}
					return { provider, status: verified ? 'verified' : 'not_found' };
				} catch {
					return { provider, status: 'unavailable' };
				}
			})
		);
	}
}
const services = new WeakMap<PrismaClient, VoteService>();
export function voteService(prisma: PrismaClient, botId: string) {
	let service = services.get(prisma);
	if (!service) {
		// Listing credentials belong to the public bot; never verify votes for the dev bot.
		service = new VoteService(prisma, {
			botId,
			...(botId === LISTED_BOT_ID ? { topggToken: process.env.TOP_BOT_TOKEN, dblToken: process.env.DBL_BOT_TOKEN } : {})
		});
		services.set(prisma, service);
	}
	return service;
}
