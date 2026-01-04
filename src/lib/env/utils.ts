import { isNullishOrEmpty } from '@sapphire/utilities';
import type { RadonEnv, RadonEnvAny, RadonEnvBoolean, RadonEnvInteger, RadonEnvString } from './types.js';

export function envParseInteger(key: RadonEnvInteger, defaultValue?: number): number {
	const value = process.env[key];
	if (isNullishOrEmpty(value)) {
		if (defaultValue === undefined) throw new Error(`[ENV] ${key} - The key must be an integer, but is empty or undefined.`);
		return defaultValue;
	}

	const integer = Number(value);
	if (Number.isInteger(integer)) return integer;
	throw new Error(`[ENV] ${key} - The key must be an integer, but received '${value}'.`);
}

export function envParseBoolean(key: RadonEnvBoolean, defaultValue?: boolean): boolean {
	const value = process.env[key];
	if (isNullishOrEmpty(value)) {
		if (defaultValue === undefined) throw new Error(`[ENV] ${key} - The key must be a boolean, but is empty or undefined.`);
		return defaultValue;
	}

	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(`[ENV] ${key} - The key must be a boolean, but received '${value}'.`);
}

export function envParseString<K extends RadonEnvString>(key: K, defaultValue?: RadonEnv[K]): RadonEnv[K] {
	const value = process.env[key];
	if (isNullishOrEmpty(value)) {
		if (defaultValue === undefined) throw new Error(`[ENV] ${key} - The key must be a string, but is empty or undefined.`);
		return defaultValue;
	}

	return value;
}

export function envParseArray<K extends RadonEnvString>(key: K, defaultValue?: RadonEnv[K][]): RadonEnv[K][] {
	const value = process.env[key];
	if (isNullishOrEmpty(value)) {
		if (defaultValue === undefined) throw new Error(`[ENV] ${key} - The key must be an array, but is empty or undefined.`);
		return defaultValue;
	}

	return value.split(' ') as RadonEnv[K][];
}

export function envIsDefined<K extends readonly RadonEnvAny[]>(...keys: K): boolean {
	return keys.every((key) => {
		const value = process.env[key];
		return value !== undefined && value.length !== 0;
	});
}
