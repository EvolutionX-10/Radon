import { randomUUID } from 'node:crypto';

export type LockKind = 'channel' | 'role' | 'thread';
export interface LockRecord {
	id: string;
	guildId: string;
	targetId: string;
	roleId: string;
	kind: string;
	snapshot: string;
	operationToken: string;
	leaseUntil: Date | null;
	expiresAt: Date | null;
	createdAt: Date;
}
export interface LockStore {
	find(id: string): Promise<LockRecord | null>;
	create(record: LockRecord): Promise<void>;
	claim(id: string, previousToken: string, token: string, now: Date, until: Date): Promise<boolean>;
	renew(id: string, token: string, until: Date): Promise<boolean>;
	release(id: string, token: string): Promise<void>;
	remove(id: string, token: string): Promise<void>;
}
export interface LockTarget {
	id: string;
	guildId: string;
	targetId: string;
	roleId: string;
	kind: LockKind;
	capture(): Promise<string>;
	apply(reason: string): Promise<void>;
	restore(snapshot: string, reason: string): Promise<void>;
}

export interface LockHeartbeat {
	start(tick: () => Promise<void>): () => void;
}
const defaultHeartbeat: LockHeartbeat = {
	start(tick) {
		const timer = setInterval(() => {
			void tick();
		}, 30_000);
		timer.unref();
		return () => clearInterval(timer);
	}
};

/** A snapshot is durable before Discord changes; leases serialize work across shards. */
export class LockService {
	public constructor(
		private readonly store: LockStore,
		private readonly now = () => new Date(),
		private readonly heartbeat: LockHeartbeat = defaultHeartbeat
	) {}

	public async lock(target: LockTarget, reason: string, expiresAt: Date | null = null): Promise<'locked' | 'already locked'> {
		if (await this.store.find(target.id)) return 'already locked';
		const token = randomUUID();
		const snapshot = await target.capture();
		const now = this.now();
		try {
			await this.store.create({
				id: target.id,
				guildId: target.guildId,
				targetId: target.targetId,
				roleId: target.roleId,
				kind: target.kind,
				snapshot,
				operationToken: token,
				leaseUntil: new Date(now.getTime() + 120_000),
				expiresAt,
				createdAt: now
			});
		} catch (error) {
			// A competing lock must never replace the first lock's original permissions.
			if (await this.store.find(target.id)) return 'already locked';
			throw error;
		}
		try {
			await this.withLease(target.id, token, () => target.apply(reason));
			return 'locked';
		} finally {
			// Retain the snapshot even on an ambiguous API failure so /unlock can recover.
			await this.store.release(target.id, token);
		}
	}

	private async withLease<T>(id: string, token: string, operation: () => Promise<T>): Promise<T> {
		let lost = false;
		let failure: unknown;
		let pending: Promise<void> | undefined;
		const renew = (): Promise<void> => {
			if (pending) return pending;
			pending = this.store
				.renew(id, token, new Date(this.now().getTime() + 120_000))
				.then(
					(owned) => {
						if (!owned) lost = true;
						else failure = undefined;
					},
					(error: unknown) => {
						failure = error;
					}
				)
				.finally(() => {
					pending = undefined;
				});
			return pending;
		};
		const stop = this.heartbeat.start(renew);
		try {
			const result = await operation();
			await pending;
			await renew();
			if (lost || failure)
				throw new Error('Lock ownership could not be verified; recovery data was retained. Retry unlock after checking the channel.');
			return result;
		} finally {
			stop();
			await pending;
		}
	}

	public async unlock(target: LockTarget, reason: string): Promise<'restored' | 'no snapshot' | 'busy'> {
		const record = await this.store.find(target.id);
		if (!record) return 'no snapshot';
		const token = randomUUID();
		const now = this.now();
		if (!(await this.store.claim(target.id, record.operationToken, token, now, new Date(now.getTime() + 120_000)))) return 'busy';
		try {
			await this.withLease(target.id, token, () => target.restore(record.snapshot, reason));
			await this.store.remove(target.id, token);
			return 'restored';
		} finally {
			await this.store.release(target.id, token);
		}
	}
}

export interface BulkResult {
	completed: number;
	skipped: number;
	failures: string[];
}

/** Bound concurrency to one; discord.js handles REST bucket delays without fixed sleeps. */
export async function runLockBatch<T>(
	items: readonly T[],
	run: (item: T) => Promise<boolean>,
	identify: (item: T) => string,
	progress?: (done: number, total: number) => Promise<unknown>
): Promise<BulkResult> {
	const result: BulkResult = { completed: 0, skipped: 0, failures: [] };
	for (const [index, item] of items.entries()) {
		try {
			if (await run(item)) result.completed++;
			else result.skipped++;
		} catch (error) {
			result.failures.push(`${identify(item)}: ${error instanceof Error ? error.message : 'Request failed'}`);
		}
		if (progress && (index + 1) % 10 === 0 && index + 1 < items.length) await progress(index + 1, items.length).catch(() => undefined);
	}
	return result;
}
