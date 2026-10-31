export interface MetricSummary {
	name: string;
	count: number;
	failures: number;
	timedCount: number;
	averageMs: number;
	maxMs: number;
	recentP95Ms: number;
}

interface MetricSeries {
	count: number;
	failures: number;
	timedCount: number;
	totalMs: number;
	maxMs: number;
	samples: number[];
	nextSample: number;
}

/** Process-local aggregate measurements. Never store request bodies, user IDs or query text. */
export class PerformanceMetrics {
	private readonly series = new Map<string, MetricSeries>();

	public constructor(
		public readonly enabled = true,
		private readonly maxSeries = 128,
		private readonly maxSamples = 128
	) {
		if (!Number.isInteger(maxSeries) || maxSeries < 1 || !Number.isInteger(maxSamples) || maxSamples < 1) {
			throw new RangeError('Metric limits must be positive integers.');
		}
	}

	public record(name: string, durationMs: number | undefined, success = true): void {
		if (!this.enabled || !name || name.length > 100) return;
		let data = this.series.get(name);
		if (!data) {
			if (this.series.size >= this.maxSeries) return;
			data = { count: 0, failures: 0, timedCount: 0, totalMs: 0, maxMs: 0, samples: [], nextSample: 0 };
			this.series.set(name, data);
		}
		data.count++;
		if (!success) data.failures++;
		// Sapphire reports -1 for unsuccessful command duration: count it without inventing timing.
		if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) return;
		data.timedCount++;
		data.totalMs += durationMs;
		data.maxMs = Math.max(data.maxMs, durationMs);
		data.samples[data.nextSample] = durationMs;
		data.nextSample = (data.nextSample + 1) % this.maxSamples;
	}

	public snapshot(): MetricSummary[] {
		return [...this.series].map(([name, data]) => {
			const sorted = [...data.samples].sort((a, b) => a - b);
			return {
				name,
				count: data.count,
				failures: data.failures,
				timedCount: data.timedCount,
				averageMs: data.timedCount ? data.totalMs / data.timedCount : 0,
				maxMs: data.maxMs,
				recentP95Ms: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : 0
			};
		});
	}
}

export const performanceMetrics = new PerformanceMetrics(process.env.RADON_METRICS_ENABLED === 'true');

/** Parse only formats emitted by @sapphire/stopwatch, preserving sub-ms and slow requests. */
export function stopwatchMilliseconds(value: unknown): number | undefined {
	if (typeof value !== 'string') return undefined;
	const match = /^(\d+(?:\.\d+)?)(μs|ms|s)$/.exec(value);
	if (!match) return undefined;
	const result = Number(match[1]) * (match[2] === 's' ? 1000 : match[2] === 'μs' ? 0.001 : 1);
	return Number.isFinite(result) ? result : undefined;
}
