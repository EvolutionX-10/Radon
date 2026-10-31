import { describe, expect, it } from 'bun:test';
import {
	makeNetmarbleAdapter,
	maskMemberCode,
	ProviderQueue,
	receiptKey,
	RedemptionService,
	retryAfterMs,
	type GameAdapter,
	type ReceiptStore,
	type Reservation
} from '../src/lib/redemption/service.js';
import { disableClaimButtons, parseClaimButton } from '../src/lib/redemption/posts.js';
import { saveMemberCode, deleteMemberCode } from '../src/lib/redemption/persistence.js';
import type { PrismaClient } from '@prisma/client';

const pid = 'A'.repeat(32);
class Receipts implements ReceiptStore {
	public data = new Map<string, { token: string; status: string; expiresAt: number }>();
	public async reserve(id: string, lifetime: number): Promise<Reservation> {
		if (id.startsWith('provider:') && lifetime <= 1) return { kind: 'acquired', token: 'test-slot' };
		const row = this.data.get(id);
		if (row?.status === 'success') return { kind: 'succeeded' };
		if (row && row.expiresAt > Date.now()) return { kind: 'busy' };
		const token = crypto.randomUUID();
		this.data.set(id, { token, status: 'pending', expiresAt: Date.now() + lifetime });
		return { kind: 'acquired', token };
	}
	public async block(id: string, lifetimeMs: number) {
		this.data.set(id, { token: 'blocked', status: 'pending', expiresAt: Date.now() + lifetimeMs });
	}
	public async finish(id: string, token: string, status: 'success' | 'unknown' | 'release') {
		const row = this.data.get(id);
		if (row?.token !== token) return;
		if (status === 'release') this.data.delete(id);
		else row.status = status;
	}
}
function adapter(redeem: GameAdapter['redeem']): GameAdapter {
	return { id: 'sololv', provider: 'netmarble', validateAccount: (value) => value.length === 32, redeem };
}

describe('redemption service', () => {
	it('shares duplicate protection across users and never sends a successful coupon twice', async () => {
		let calls = 0;
		const service = new RedemptionService(
			new Receipts(),
			[
				adapter(async () => {
					calls++;
					return { status: 'success', message: 'OK' };
				})
			],
			100,
			0
		);
		expect((await service.claimBatch('user-a', 'sololv', 'CODE', [{ memberCode: pid }]))[0].success).toBe(true);
		expect((await service.claimBatch('user-b', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('already_claimed');
		expect(calls).toBe(1);
	});
	it('rejects concurrent clicks for one user but processes all accounts in the accepted batch', async () => {
		let calls = 0;
		const service = new RedemptionService(
			new Receipts(),
			[
				adapter(async () => {
					calls++;
					return { status: 'success', message: 'OK' };
				})
			],
			100,
			0
		);
		const results = await Promise.allSettled([
			service.claimBatch('same', 'sololv', 'A', [{ memberCode: pid }, { memberCode: 'B'.repeat(32) }]),
			service.claimBatch('same', 'sololv', 'B', [{ memberCode: pid }])
		]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(calls).toBe(2);
	});
	it('retains unknown outcomes rather than resubmitting after a network failure', async () => {
		let calls = 0;
		const service = new RedemptionService(
			new Receipts(),
			[
				adapter(async () => {
					calls++;
					throw new TypeError('fetch failed');
				})
			],
			100,
			0
		);
		expect((await service.claimBatch('a', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('unknown');
		expect((await service.claimBatch('b', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('busy');
		expect(calls).toBe(1);
	});
	it('blocks queued requests after a publisher rate limit without retrying the POST', async () => {
		let calls = 0;
		const service = new RedemptionService(
			new Receipts(),
			[
				adapter(async () => {
					calls++;
					return { status: 'rate_limited', message: 'wait', retryAfterMs: 1_000 };
				})
			],
			100,
			0
		);
		const results = await service.claimBatch('a', 'sololv', 'CODE', [{ memberCode: pid }, { memberCode: 'B'.repeat(32) }]);
		expect(results.map((row) => row.status)).toEqual(['rate_limited', 'busy']);
		expect(calls).toBe(1);
	});
	it('validates before outbound requests and deduplicates accounts within a batch', async () => {
		let calls = 0;
		const service = new RedemptionService(
			new Receipts(),
			[
				adapter(async () => {
					calls++;
					return { status: 'success', message: 'OK' };
				})
			],
			100,
			0
		);
		await expect(service.claimBatch('a', 'other', 'CODE', [{ memberCode: pid }])).rejects.toThrow('not supported');
		await expect(service.claimBatch('a', 'sololv', 'CODE`@everyone', [{ memberCode: pid }])).rejects.toThrow('coupon');
		const results = await service.claimBatch('a', 'sololv', 'CODE', [{ memberCode: pid }, { memberCode: pid }, { memberCode: 'bad' }]);
		expect(results.map((row) => row.status)).toEqual(['success', 'invalid']);
		expect(calls).toBe(1);
	});
	it('hashes receipt keys without account identifiers and uses unambiguous tuple encoding', () => {
		expect(receiptKey('sololv', pid, 'CODE')).not.toContain(pid);
		expect(receiptKey('ab', 'c', 'd')).not.toBe(receiptKey('a', 'bc', 'd'));
		expect(maskMemberCode('short')).toBe('••••');
	});
});

describe('publisher adapter', () => {
	it('sends the existing Solo Leveling payload with a timeout signal', async () => {
		let init: RequestInit | undefined;
		const fetcher = (async (_url: unknown, options: RequestInit) => {
			init = options;
			return Response.json({ errorCode: 200, success: true });
		}) as typeof fetch;
		const result = await makeNetmarbleAdapter(fetcher).redeem('CODE', { memberCode: pid }, AbortSignal.timeout(100));
		expect(result.status).toBe('success');
		expect(JSON.parse(String(init?.body))).toEqual({ gameCode: 'sololv', couponCode: 'CODE', langCd: 'EN_US', pid });
		expect(init?.signal).toBeInstanceOf(AbortSignal);
	});
	it('handles non-JSON errors and malformed successful bodies without claiming success', async () => {
		for (const response of [new Response('<html>bad</html>', { status: 502 }), Response.json({ unexpected: true })]) {
			const fetcher = (async () => response) as typeof fetch;
			expect((await makeNetmarbleAdapter(fetcher).redeem('CODE', { memberCode: pid }, AbortSignal.timeout(100))).status).toBe('unknown');
		}
	});
	it('does not expose publisher error text containing member codes or mentions', async () => {
		const fetcher = (async () => Response.json({ errorCode: 24002, success: false, errorCause: `${pid} @everyone` })) as typeof fetch;
		const result = await makeNetmarbleAdapter(fetcher).redeem('CODE', { memberCode: pid }, AbortSignal.timeout(100));
		expect(result.status).toBe('invalid');
		expect(result.message).not.toContain(pid);
		expect(result.message).not.toContain('@everyone');
	});
	it('interprets Retry-After seconds and dates with safe bounds', () => {
		expect(retryAfterMs('5', 0)).toBe(5_000);
		expect(retryAfterMs('Thu, 01 Jan 1970 00:00:05 GMT', 0)).toBe(5_000);
		expect(retryAfterMs('nonsense')).toBe(60_000);
		expect(retryAfterMs('-1')).toBe(1_000);
	});
});

describe('coupon posts', () => {
	it('keeps old posted buttons working and rejects malformed IDs', () => {
		expect(parseClaimButton('code-CODE')).toEqual({ code: 'CODE', expired: false });
		expect(parseClaimButton('redeem:0:CODE')).toEqual({ code: 'CODE', expired: false });
		expect(parseClaimButton('code-')).toBeNull();
		expect(parseClaimButton('code-@everyone')).toBeNull();
	});
	it('expires at the boundary and disables nested claim buttons without changing other buttons', () => {
		expect(parseClaimButton(`redeem:${(1_000).toString(36)}:CODE`, 1_000)?.expired).toBe(true);
		const original = [{ components: [{ accessory: { custom_id: 'code-CODE', type: 2 } }, { custom_id: 'other', type: 2 }] }];
		const disabled = disableClaimButtons(original);
		expect(disabled[0].components[0].accessory).toEqual({ custom_id: 'code-CODE', type: 2, disabled: true });
		expect(disabled[0].components[1]).not.toHaveProperty('disabled');
		expect(original[0].components[0].accessory).not.toHaveProperty('disabled');
	});
});

describe('bounded provider queue', () => {
	it('bounds pending work and serializes outbound requests', async () => {
		const queue = new ProviderQueue(0, 1);
		let release!: () => void;
		const pending = queue.run(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);
		await Promise.resolve();
		await expect(queue.run(async () => undefined)).rejects.toThrow('busy');
		release();
		await pending;
	});
});

function fakeAccounts(initial: string[] | null) {
	let codes = initial;
	const labels = new Map<string, string>();
	const prisma = {
		async $runCommandRaw(command: {
			query: { memberCodes: string[] };
			update: { $push?: { memberCodes: string }; $set?: { memberCodes?: string[] } };
		}) {
			if (JSON.stringify(codes) !== JSON.stringify(command.query.memberCodes)) return { ok: 1, value: null };
			const old = codes;
			codes = command.update.$push ? [...codes!, command.update.$push.memberCodes] : command.update.$set!.memberCodes!;
			return { ok: 1, value: { memberCodes: old } };
		},
		memberCodes: {
			async findUnique() {
				const snapshot = codes ? [...codes] : null;
				await Promise.resolve();
				return snapshot ? { memberCodes: snapshot } : null;
			},
			async create({ data }: { data: { memberCodes: string[] } }) {
				if (codes) throw { code: 'P2002' };
				codes = data.memberCodes;
			}
		},
		redemptionAccountLabel: {
			async upsert({ where, create }: { where: { id: string }; create: { name: string } }) {
				labels.set(where.id, create.name);
			},
			async deleteMany({ where }: { where: { id: string } }) {
				labels.delete(where.id);
			}
		}
	} as unknown as PrismaClient;
	return { prisma, codes: () => codes, labels };
}
describe('concurrent account management', () => {
	it('preserves both concurrent first-account saves', async () => {
		const fake = fakeAccounts(null);
		await Promise.all([saveMemberCode(fake.prisma, 'user', pid), saveMemberCode(fake.prisma, 'user', 'B'.repeat(32))]);
		expect(fake.codes()).toHaveLength(2);
	});
	it('does not exceed five accounts during concurrent additions', async () => {
		const fake = fakeAccounts(['1', '2', '3', '4']);
		const results = await Promise.allSettled([saveMemberCode(fake.prisma, 'user', pid), saveMemberCode(fake.prisma, 'user', 'B'.repeat(32))]);
		expect(fake.codes()).toHaveLength(5);
		expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
	});
	it('does not lose a simultaneous add while deleting and permits naming an existing account', async () => {
		const fake = fakeAccounts([pid]);
		await saveMemberCode(fake.prisma, 'user', pid, 'Main');
		expect(fake.labels.size).toBe(1);
		await Promise.all([deleteMemberCode(fake.prisma, 'user', pid), saveMemberCode(fake.prisma, 'user', 'B'.repeat(32))]);
		expect(fake.codes()).toEqual(['B'.repeat(32)]);
	});
});

describe('multiple bot instances', () => {
	it('shares provider start limits and publisher cooldowns through persistent receipts', async () => {
		const receipts = new Receipts();
		let calls = 0;
		const game = adapter(async () => {
			calls++;
			return { status: 'rate_limited', message: 'wait', retryAfterMs: 60_000 };
		});
		const instanceA = new RedemptionService(receipts, [game], 100, 1_000);
		const instanceB = new RedemptionService(receipts, [game], 100, 1_000);
		expect((await instanceA.claimBatch('user-a', 'sololv', 'FIRST', [{ memberCode: pid }]))[0].status).toBe('rate_limited');
		expect((await instanceB.claimBatch('user-b', 'sololv', 'SECOND', [{ memberCode: pid }]))[0].status).toBe('busy');
		expect(calls).toBe(1);
	});
});

describe('timeout and preview protection', () => {
	it('passes an expiring abort signal and holds a timed-out redemption without retry', async () => {
		let calls = 0;
		const game = adapter(async (_coupon, _account, signal) => {
			calls++;
			await new Promise((_, reject) => {
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
			return { status: 'success', message: 'unreachable' };
		});
		const service = new RedemptionService(new Receipts(), [game], 10, 0);
		const result = await service.claimBatch('timeout-user', 'sololv', 'CODE', [{ memberCode: pid }]);
		expect(result[0].status).toBe('unknown');
		expect((await service.claimBatch('another-user', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('busy');
		expect(calls).toBe(1);
	});
	it('shares a preview Retry-After cooldown with redemption requests', async () => {
		const receipts = new Receipts();
		let calls = 0;
		const fetcher = (async () => {
			calls++;
			return new Response('', { status: 429, headers: { 'Retry-After': '60' } });
		}) as typeof fetch;
		const service = new RedemptionService(receipts, [makeNetmarbleAdapter(fetcher)], 100, 0);
		expect(await service.preview('sololv', 'CODE', { memberCode: pid })).toBeNull();
		expect((await service.claimBatch('a', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('busy');
		expect(calls).toBe(1);
	});
});

describe('malformed publisher outcomes', () => {
	it('holds incomplete, contradictory and delivery-failure envelopes without another POST', async () => {
		for (const body of [
			{ errorCode: 200 },
			{ errorCode: 200, success: 'true' },
			{ errorCode: 200, success: false },
			{ errorCode: 24002, success: true },
			{ errorCode: 24012, success: false },
			{ errorCode: 99999, success: false }
		]) {
			let calls = 0;
			const fetcher = (async () => {
				calls++;
				return Response.json(body);
			}) as typeof fetch;
			const service = new RedemptionService(new Receipts(), [makeNetmarbleAdapter(fetcher)], 100, 0);
			expect((await service.claimBatch('first', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('unknown');
			expect((await service.claimBatch('second', 'sololv', 'CODE', [{ memberCode: pid }]))[0].status).toBe('busy');
			expect(calls).toBe(1);
		}
	});
	it('distinguishes an expired coupon from a local confirmed-success receipt', async () => {
		const fetcher = (async () => Response.json({ errorCode: 24003, success: false })) as typeof fetch;
		expect((await makeNetmarbleAdapter(fetcher).redeem('CODE', { memberCode: pid }, AbortSignal.timeout(100))).status).toBe('expired');
	});
});

describe('interaction error privacy', () => {
	it('excludes member codes, modal fields, error messages and arbitrary error names', async () => {
		const { interactionFailureMetadata } = await import('../src/lib/redemption/privacy.js');
		const payload = {
			interaction: { id: '1234567890', type: 5, fields: { memberCodeInput: pid } },
			handler: { name: 'memberCodeInput' },
			result: { memberCode: pid }
		};
		const error = Object.assign(new Error(`Prisma request failed: ${pid}`), { name: pid });
		const metadata = interactionFailureMetadata(error, payload);
		expect(metadata).toEqual({ errorType: 'Error', interactionId: '1234567890', interactionType: 5, handler: 'memberCodeInput' });
		expect(JSON.stringify(metadata)).not.toContain(pid);
	});
});
