import { Time } from '@sapphire/time-utilities';

/**
 * Seconds to milliseconds
 * @param seconds
 * @returns milliseconds
 */
export function sec(seconds: number): number {
	if (isNaN(seconds)) throw new Error('Input must be a valid number');
	return Time.Second * seconds;
}

/**
 * Minutes to milliseconds
 * @param minutes
 * @returns milliseconds
 */
export function mins(minutes: number): number {
	if (isNaN(minutes)) throw new Error('Input must be a valid number');
	return Time.Minute * minutes;
}
/**
 * Hours to milliseconds
 * @param hours
 * @returns milliseconds
 */
export function hours(hours: number): number {
	if (isNaN(hours)) throw new Error('Input must be a valid number');
	return Time.Hour * hours;
}

export function time({ unit, time }: { unit: 'sec' | 'mins' | 'hours'; time: number }) {
	switch (unit) {
		case 'sec':
			return sec(time);
		case 'mins':
			return mins(time);
		case 'hours':
			return hours(time);
		default:
			throw new Error('Invalid unit');
	}
}
