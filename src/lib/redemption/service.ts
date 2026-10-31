import { createHash, randomUUID } from 'node:crypto';

export type ClaimStatus =
	| 'success'
	| 'already_claimed'
	| 'rejected'
	| 'rate_limited'
	| 'unknown'
	| 'busy'
	| 'invalid'
	| 'invalid_account'
	| 'expired';
export interface ClaimResult {
	success: boolean;
	status: ClaimStatus;
	message: string;
	code: string;
	memberCode: string;
	elapsedTime?: string;
	elapsedMs?: number;
}
export interface RedemptionAccount {
	memberCode: string;
	name?: string;
	server?: string;
}
export interface CouponPreview {
	name: string;
	imageUrl?: string;
}
export interface GameAdapter {
	id: string;
	provider: string;
	validateAccount(value: string): boolean;
	preview?(coupon: string, account: RedemptionAccount, signal: AbortSignal): Promise<CouponPreview | null>;
	redeem(coupon: string, account: RedemptionAccount, signal: AbortSignal): Promise<{ status: ClaimStatus; message: string; retryAfterMs?: number }>;
}
export type Reservation = { kind: 'acquired'; token: string } | { kind: 'succeeded' | 'busy' };
export interface ReceiptStore {
	reserve(id: string, lifetimeMs: number): Promise<Reservation>;
	finish(id: string, token: string, status: 'success' | 'unknown' | 'release'): Promise<void>;
	block(id: string, lifetimeMs: number): Promise<void>;
}
export class RedemptionError extends Error {}
class PublisherRateLimit extends RedemptionError {
	public constructor(public readonly durationMs: number) {
		super('The publisher is rate limiting requests.');
	}
}
export function receiptKey(game: string, memberCode: string, coupon: string) {
	return createHash('sha256')
		.update(JSON.stringify([game, memberCode, coupon]))
		.digest('hex');
}
export function maskMemberCode(code: string) {
	return code.length < 9 ? '••••' : `${code.slice(0, 4)}…${code.slice(-4)}`;
}
export function validateCoupon(value: string) {
	return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}
export function retryAfterMs(value: string | null, now = Date.now()) {
	if (!value) return 60_000;
	const seconds = Number(value);
	const duration = Number.isFinite(seconds) ? seconds * 1_000 : Date.parse(value) - now;
	return Number.isFinite(duration) ? Math.max(1_000, Math.min(duration, 86_400_000)) : 60_000;
}

/** One bounded queue per publisher. Never retries a redemption POST. */
export class ProviderQueue {
	private tail: Promise<void> = Promise.resolve();
	private count = 0;
	private nextRequest = 0;
	private blockedUntil = 0;
	public constructor(
		private readonly intervalMs = 1_000,
		private readonly maxPending = 20
	) {}
	public block(durationMs: number) {
		this.blockedUntil = Math.max(this.blockedUntil, Date.now() + durationMs);
	}
	public async run<T>(operation: () => Promise<T>): Promise<T> {
		if (this.count >= this.maxPending) throw new RedemptionError('Redemption is busy. Please try again later.');
		if (Date.now() < this.blockedUntil) throw new RedemptionError('The game service is rate limiting requests. Please try again later.');
		this.count++;
		const previous = this.tail;
		let release!: () => void;
		this.tail = new Promise<void>((resolve) => {
			release = resolve;
		});
		try {
			await previous;
			if (Date.now() < this.blockedUntil) throw new RedemptionError('The game service is rate limiting requests. Please try again later.');
			const delay = this.nextRequest - Date.now();
			if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
			this.nextRequest = Date.now() + this.intervalMs;
			return await operation();
		} finally {
			this.nextRequest = Math.max(this.nextRequest, Date.now() + this.intervalMs);
			this.count--;
			release();
		}
	}
}

export class RedemptionService {
	private readonly queues = new Map<string, ProviderQueue>();
	public constructor(
		private readonly receipts: ReceiptStore,
		private readonly adapters: readonly GameAdapter[],
		private readonly timeoutMs = 10_000,
		private readonly intervalMs = 1_000,
		private readonly maxAccounts = 5
	) {}
	public async preview(game: string, coupon: string, account: RedemptionAccount): Promise<CouponPreview | null> {
		const adapter = this.adapters.find((entry) => entry.id === game);
		if (!adapter?.preview || !adapter.validateAccount(account.memberCode) || !validateCoupon(coupon)) return null;
		const queue = this.queues.get(adapter.provider) ?? new ProviderQueue(this.intervalMs);
		this.queues.set(adapter.provider, queue);
		try {
			return await queue.run(async () => {
				const slot = await this.receipts.reserve(`provider:${adapter.provider}`, Math.max(1, this.intervalMs));
				if (slot.kind !== 'acquired') return null;
				return adapter.preview!(coupon, account, AbortSignal.timeout(this.timeoutMs));
			});
		} catch (error) {
			if (error instanceof PublisherRateLimit) {
				queue.block(error.durationMs);
				await this.receipts.block(`provider:${adapter.provider}`, error.durationMs);
			}
			return null;
		}
	}
	public async claimBatch(userId: string, game: string, rawCoupon: string, accounts: RedemptionAccount[]): Promise<ClaimResult[]> {
		const coupon = rawCoupon.trim();
		const adapter = this.adapters.find((entry) => entry.id === game);
		if (!adapter) throw new RedemptionError('This game is not supported yet.');
		if (!validateCoupon(coupon)) throw new RedemptionError('Enter a coupon containing 1–64 letters, numbers, underscores or hyphens.');
		if (accounts.length < 1 || accounts.length > this.maxAccounts)
			throw new RedemptionError(`Choose between one and ${this.maxAccounts} accounts.`);
		const cooldown = await this.receipts.reserve(`user:${receiptKey('user', userId, '')}`, 3_000);
		if (cooldown.kind !== 'acquired') throw new RedemptionError('Please wait three seconds between redemption requests.');
		const unique = [
			...new Map(accounts.map((account) => [account.memberCode.trim(), { ...account, memberCode: account.memberCode.trim() }])).values()
		];
		const queue = this.queues.get(adapter.provider) ?? new ProviderQueue(this.intervalMs);
		this.queues.set(adapter.provider, queue);
		const results: ClaimResult[] = [];
		for (const account of unique) {
			const base = { code: coupon, memberCode: account.memberCode };
			if (!adapter.validateAccount(account.memberCode)) {
				results.push({ ...base, success: false, status: 'invalid', message: 'Invalid member code. Copy it from the game account settings.' });
				continue;
			}
			const id = receiptKey(game, account.memberCode, coupon);
			const reservation = await this.receipts.reserve(id, 10 * 60_000);
			if (reservation.kind !== 'acquired') {
				results.push({
					...base,
					success: false,
					status: reservation.kind === 'succeeded' ? 'already_claimed' : 'busy',
					message:
						reservation.kind === 'succeeded'
							? 'Already successfully redeemed through Radon.'
							: 'This redemption is pending or its outcome is unknown. Check your in-game mailbox before trying again later.'
				});
				continue;
			}
			const started = Date.now();
			let status: ClaimStatus = 'unknown';
			let attempted = false;
			try {
				const result = await queue.run(async () => {
					const providerSlot = await this.receipts.reserve(`provider:${adapter.provider}`, Math.max(1, this.intervalMs));
					if (providerSlot.kind !== 'acquired') throw new RedemptionError('The game service is busy. Please try again shortly.');
					attempted = true;
					const result = await adapter.redeem(coupon, account, AbortSignal.timeout(this.timeoutMs));
					if (result.retryAfterMs) {
						queue.block(result.retryAfterMs);
						await this.receipts.block(`provider:${adapter.provider}`, result.retryAfterMs);
					}
					return result;
				});
				status = result.status;
				results.push({
					...base,
					success: status === 'success',
					status,
					message: result.message,
					elapsedTime: `${Date.now() - started}ms`,
					elapsedMs: Date.now() - started
				});
			} catch (error) {
				status = attempted ? 'unknown' : 'busy';
				results.push({
					...base,
					success: false,
					status,
					message:
						error instanceof RedemptionError
							? error.message
							: 'The request outcome is unknown. Check your in-game mailbox before trying again later.',
					elapsedTime: `${Date.now() - started}ms`,
					elapsedMs: Date.now() - started
				});
			} finally {
				await this.receipts.finish(id, reservation.token, status === 'success' ? 'success' : status === 'unknown' ? 'unknown' : 'release');
			}
		}
		return results;
	}
}

export function makeNetmarbleAdapter(fetcher: typeof fetch = fetch, game = 'sololv'): GameAdapter {
	if (!['sololv', 'tskgb', 'nanarise'].includes(game)) throw new RedemptionError('Unsupported Netmarble game.');
	return {
		id: game,
		provider: 'netmarble',
		// Preserve the existing accepted 30–36 character account-code range.
		validateAccount: (value) => (game === 'sololv' ? /^[A-Za-z0-9]{30,36}$/.test(value) : /^[A-Za-z0-9_-]{1,64}$/.test(value)),
		async preview(coupon, account, signal) {
			const url = new URL('https://coupon.netmarble.com/api/coupon/reward');
			url.search = new URLSearchParams({ gameCode: game, couponCode: coupon, langCd: 'EN_US', pid: account.memberCode }).toString();
			const response = await fetcher(url, { signal });
			if (response.status === 429) throw new PublisherRateLimit(retryAfterMs(response.headers.get('Retry-After')));
			if (!response.ok) return null;
			const data: unknown = await response.json();
			if (!data || typeof data !== 'object' || !('resultData' in data) || !Array.isArray(data.resultData)) return null;
			const item: unknown = data.resultData[0];
			if (!item || typeof item !== 'object' || !('productName' in item) || typeof item.productName !== 'string') return null;
			const imageUrl =
				'productImageUrl' in item && typeof item.productImageUrl === 'string' && item.productImageUrl.startsWith('https://')
					? item.productImageUrl
					: undefined;
			return { name: item.productName.slice(0, 250), imageUrl };
		},
		async redeem(coupon, account, signal) {
			const response = await fetcher('https://coupon.netmarble.com/api/coupon', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ gameCode: game, couponCode: coupon, langCd: 'EN_US', pid: account.memberCode }),
				signal
			});
			if (response.status === 429)
				return {
					status: 'rate_limited',
					message: 'The game service is rate limiting requests. Please try again later.',
					retryAfterMs: retryAfterMs(response.headers.get('Retry-After'))
				};
			if (!response.ok)
				return {
					status: 'unknown',
					message: 'The game service returned an unexpected response. Check your in-game mailbox before retrying.'
				};
			const body: unknown = await response.json();
			if (!body || typeof body !== 'object' || !('errorCode' in body) || typeof body.errorCode !== 'number')
				return {
					status: 'unknown',
					message: 'The game service returned an unexpected response. Check your in-game mailbox before retrying.'
				};
			if (!('success' in body) || typeof body.success !== 'boolean')
				return { status: 'unknown', message: 'The game returned an incomplete result. Check your in-game mailbox before retrying.' };
			if (body.errorCode === 200 && body.success === true) return { status: 'success', message: 'Coupon claimed successfully.' };
			if (body.success || body.errorCode === 200)
				return { status: 'unknown', message: 'The game returned an inconsistent result. Check your in-game mailbox before retrying.' };
			// Codes verified in Netmarble's published coupon client; never infer that
			// expired means previously claimed, or that a delivery failure is safe to retry.
			switch (body.errorCode) {
				case 21002:
				case 21003:
				case 24007:
					return { status: 'invalid_account', message: 'Check your member code and game account settings.' };
				case 24002:
					return { status: 'invalid', message: 'The coupon code is invalid. Check the published code.' };
				case 24003:
					return { status: 'expired', message: 'This coupon has expired.' };
				case 24001:
					return { status: 'rejected', message: 'The publisher has locked this coupon. Please try again later.' };
				case 24004:
					return { status: 'rejected', message: 'The redemption limit for this coupon has been reached.' };
				case 24005:
					return { status: 'rejected', message: 'This coupon is not available for this account.' };
				case 24006:
					return { status: 'rejected', message: 'No rewards remain for this coupon.' };
				case 24008:
				case 24009:
				case 24010:
				case 24011:
					return { status: 'rejected', message: 'This coupon is unavailable for your region or game version.' };
				default:
					return { status: 'unknown', message: 'The publisher could not confirm delivery. Check your in-game mailbox before retrying.' };
			}
		}
	};
}

export { randomUUID };
