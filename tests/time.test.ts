import { Time } from '@sapphire/duration';
import { describe, expect, it } from 'bun:test';
import { formatDuration } from '../src/lib/utility/functions/time.js';
import { hours, mins, sec, time } from '../src/lib/utility/functions/duration.js';

describe('time utilities', () => {
	it('converts seconds, minutes, and hours to milliseconds', () => {
		expect(sec(2)).toBe(Time.Second * 2);
		expect(mins(3)).toBe(Time.Minute * 3);
		expect(hours(1)).toBe(Time.Hour * 1);
	});

	it('routes time() to the correct unit converter', () => {
		expect(time({ unit: 'sec', time: 5 })).toBe(Time.Second * 5);
		expect(time({ unit: 'mins', time: 1 })).toBe(Time.Minute * 1);
		expect(time({ unit: 'hours', time: 2 })).toBe(Time.Hour * 2);
	});

	it('throws on invalid numeric input', () => {
		expect(() => sec(Number.NaN)).toThrow(/valid number/);
		expect(() => mins(Number.NaN)).toThrow(/valid number/);
		expect(() => hours(Number.NaN)).toThrow(/valid number/);
	});

	it('formats durations consistently', () => {
		expect(formatDuration(0)).toBe('\u200b\u200b');
		expect(formatDuration(62_000)).toBe('01:02');
		expect(formatDuration(3_723_000)).toBe('01:02:03');
	});
});
