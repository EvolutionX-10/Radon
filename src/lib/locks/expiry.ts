import type { LockRecord } from './LockService.js';

const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
/** Keep scheduling input explicit; no calendar months or negative/ambiguous durations. */
export function parseLockDuration(input: string): number | null {
	const value = input.trim();
	if (!value) return null;
	if (!/^(?:\d+(?:\.\d+)?\s*[smhdw]\s*)+$/i.test(value)) throw new Error('Use a duration such as 10m, 2h, or 1d 6h.');
	let duration = 0;
	for (const part of value.matchAll(/(\d+(?:\.\d+)?)\s*([smhdw])/gi)) duration += Number(part[1]) * units[part[2].toLowerCase()];
	if (!Number.isFinite(duration) || duration < 10_000 || duration > 28 * units.d)
		throw new Error('Temporary locks must last between 10 seconds and 28 days.');
	return duration;
}

export interface LockExpiryDependencies {
	listDue(): Promise<LockRecord[]>;
	restore(record: LockRecord): Promise<'restored' | 'busy' | 'no snapshot'>;
	defer(record: LockRecord, until: Date): Promise<void>;
	error(error: unknown): void;
}

/** Restarts read persisted due dates; failed restorations retain data and back off. */
export class LockExpiryWorker {
	private running = false;
	public constructor(
		private readonly dependencies: LockExpiryDependencies,
		private readonly now = () => new Date()
	) {}
	public async run(): Promise<void> {
		if (this.running) return;
		this.running = true;
		try {
			for (const record of await this.dependencies.listDue()) {
				try {
					await this.dependencies.restore(record);
				} catch (error) {
					this.dependencies.error(error);
					await this.dependencies
						.defer(record, new Date(this.now().getTime() + 300_000))
						.catch((failure) => this.dependencies.error(failure));
				}
			}
		} catch (error) {
			this.dependencies.error(error);
		} finally {
			this.running = false;
		}
	}
}
