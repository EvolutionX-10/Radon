import type { Prisma, PrismaClient } from '@prisma/client';

export function checkedMongoResult(result: Prisma.JsonObject, requireMatch = false): Prisma.JsonObject {
	if (result.ok !== 1 || result.writeConcernError || (Array.isArray(result.writeErrors) && result.writeErrors.length)) {
		throw new Error('AutoMod MongoDB write was not acknowledged.');
	}
	if (requireMatch && result.n !== 1) throw new Error('AutoMod recovery lease ownership was lost.');
	return result;
}

export interface LeaseTiming {
	leaseMilliseconds: number;
	renewMilliseconds: number;
	retryMilliseconds: number;
}
export const defaultLeaseTiming: LeaseTiming = { leaseMilliseconds: 300_000, renewMilliseconds: 60_000, retryMilliseconds: 60_000 };

/** A shared renewable apply/recovery lease. Discord itself has no fencing-token API. */
export class RaidLease {
	private timer: ReturnType<typeof setInterval>;
	private renewal?: Promise<void>;
	private lost?: Error;
	private expiresAt: number;
	private stopped = false;

	public constructor(
		private readonly prisma: PrismaClient,
		private readonly guildId: string,
		private readonly token: string,
		expiresAt: Date,
		private readonly timing: LeaseTiming
	) {
		this.expiresAt = expiresAt.getTime();
		this.timer = setInterval(() => {
			void this.renew().catch(() => undefined);
		}, timing.renewMilliseconds);
		this.timer.unref();
	}

	private query(): Prisma.InputJsonObject {
		return { _id: this.guildId, raidLeaseToken: this.token, $expr: { $gt: ['$raidLeaseUntil', '$$NOW'] } };
	}

	private async renew(): Promise<void> {
		if (this.stopped) return;
		if (this.lost) throw this.lost;
		if (Date.now() >= this.expiresAt) throw (this.lost = new Error('AutoMod recovery lease expired.'));
		if (this.renewal) return this.renewal;
		const expiresAt = new Date(Date.now() + this.timing.leaseMilliseconds);
		const pending = this.prisma
			.$runCommandRaw({
				update: 'automodConfig',
				updates: [{ q: this.query(), u: { $set: { raidLeaseUntil: { $date: expiresAt.toISOString() } } } }]
			})
			.then((result) => {
				checkedMongoResult(result, true);
				this.expiresAt = expiresAt.getTime();
			})
			.catch((error: unknown) => {
				this.lost = error instanceof Error ? error : new Error('AutoMod recovery lease renewal failed.');
				throw this.lost;
			});
		this.renewal = pending;
		try {
			await pending;
		} finally {
			if (this.renewal === pending) this.renewal = undefined;
		}
	}

	public async assertOwned(): Promise<void> {
		await this.renew();
		if (this.lost || Date.now() >= this.expiresAt) throw this.lost ?? new Error('AutoMod recovery lease expired.');
	}

	public async stop(): Promise<void> {
		this.stopped = true;
		clearInterval(this.timer);
		await this.renewal?.catch(() => undefined);
	}

	public async complete(fields: Prisma.InputJsonObject): Promise<void> {
		await this.assertOwned();
		await this.stop();
		checkedMongoResult(
			await this.prisma.$runCommandRaw({
				update: 'automodConfig',
				updates: [{ q: this.query(), u: { $set: { ...fields, raidLeaseToken: null, raidLeaseUntil: null } } }]
			}),
			true
		);
	}

	public async defer(milliseconds = this.timing.retryMilliseconds): Promise<void> {
		await this.stop();
		// A changed token or expired deadline belongs to another worker; do not
		// release that worker's lease or erase the original recovery snapshot.
		checkedMongoResult(
			await this.prisma.$runCommandRaw({
				update: 'automodConfig',
				updates: [
					{
						q: this.query(),
						u: { $set: { raidLeaseToken: null, raidLeaseUntil: { $date: new Date(Date.now() + milliseconds).toISOString() } } }
					}
				]
			})
		);
	}
}
