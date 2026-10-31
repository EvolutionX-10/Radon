import { describe, expect, it } from 'bun:test';
import { PerformanceMetrics, stopwatchMilliseconds } from '../src/lib/utility/functions/metrics.js';
import { registerPerformanceListeners } from '../src/listeners/System/performance.js';
import { Events, type SapphireClient } from '@sapphire/framework';
import { EventEmitter } from 'node:events';

describe('bounded aggregate performance metrics', () => {
	it('collects framework outcomes and compatible claim events without retaining private inputs', () => {
		const client = new EventEmitter();
		const metrics = new PerformanceMetrics();
		registerPerformanceListeners(client as SapphireClient, metrics);
		client.emit(Events.ChatInputCommandFinish, { userId: 'private' }, { name: 'ban' }, { duration: 15, success: true });
		client.emit(Events.ContextMenuCommandFinish, {}, { name: 'Report Message' }, { duration: -1, success: false });
		client.emit(Events.MessageCommandFinish, {}, { name: 'help' }, { duration: 1, success: true });
		client.emit('codeClaim', { elapsedTime: '1.25s', success: true, memberCode: 'private' });
		client.emit('codeClaim', { elapsedMs: 12, elapsedTime: 'invalid', success: false, status: 'rate_limited' });
		client.emit('codeClaim', { success: 'invalid' });
		client.emit('codeClaim', null);
		expect(metrics.snapshot().find((s) => s.name === 'redemption:sololv')).toMatchObject({ count: 2, failures: 1, averageMs: 631 });
		expect(metrics.snapshot().find((s) => s.name === 'redemption-failure:rate_limited')).toMatchObject({ count: 1, failures: 1 });
		expect(JSON.stringify(metrics.snapshot())).not.toContain('private');
		expect(metrics.snapshot()).toHaveLength(5);
	});
	it('does not register event hooks when collection is disabled', () => {
		const client = new EventEmitter();
		registerPerformanceListeners(client as SapphireClient, new PerformanceMetrics(false));
		expect(client.eventNames()).toEqual([]);
	});
	it('parses real Stopwatch units without truncating seconds or inventing unknown durations', () => {
		expect(stopwatchMilliseconds('1.25s')).toBe(1250);
		expect(stopwatchMilliseconds('12.34ms')).toBe(12.34);
		expect(stopwatchMilliseconds('500.00μs')).toBe(0.5);
		expect(stopwatchMilliseconds('10 minutes')).toBeUndefined();
		expect(stopwatchMilliseconds(undefined)).toBeUndefined();
	});
	it('separates failures from available timings without treating -1 as latency', () => {
		const metrics = new PerformanceMetrics();
		metrics.record('slash:ban', 10);
		metrics.record('slash:ban', 30);
		metrics.record('slash:ban', -1, false);
		expect(metrics.snapshot()).toEqual([
			{
				name: 'slash:ban',
				count: 3,
				failures: 1,
				timedCount: 2,
				averageMs: 20,
				maxMs: 30,
				recentP95Ms: 30
			}
		]);
	});
	it('retains only a fixed recent timing window while keeping lifetime aggregates', () => {
		const metrics = new PerformanceMetrics(true, 2, 2);
		metrics.record('query', 1000);
		metrics.record('query', 20);
		metrics.record('query', 10);
		expect(metrics.snapshot()[0]).toMatchObject({ count: 3, maxMs: 1000, recentP95Ms: 20 });
	});
	it('caps series and disables collection without retaining payloads', () => {
		const metrics = new PerformanceMetrics(true, 1);
		metrics.record('query', 1);
		metrics.record('unexpected-series', 2);
		expect(metrics.snapshot()).toHaveLength(1);
		const disabled = new PerformanceMetrics(false);
		disabled.record('query', 1);
		expect(disabled.snapshot()).toEqual([]);
	});
	it('ignores invalid timings and returns independent snapshots', () => {
		const metrics = new PerformanceMetrics();
		metrics.record('query', Number.NaN);
		metrics.record('query', Number.POSITIVE_INFINITY, false);
		metrics.snapshot()[0].count = 999;
		expect(metrics.snapshot()[0]).toMatchObject({ count: 2, failures: 1, timedCount: 0, averageMs: 0, recentP95Ms: 0 });
		expect(() => new PerformanceMetrics(true, 0)).toThrow(RangeError);
	});
});
