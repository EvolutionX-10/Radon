import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { envIsDefined, envParseArray, envParseBoolean, envParseInteger, envParseString } from '../src/lib/env/utils.js';

describe('env parsing utilities', () => {
	let snapshot: NodeJS.ProcessEnv;

	beforeEach(() => {
		snapshot = { ...process.env };
	});

	afterEach(() => {
		process.env = { ...snapshot };
	});

	it('parses integers and respects defaults', () => {
		process.env.TEST_INT = '42';
		expect(envParseInteger('TEST_INT')).toBe(42);

		delete process.env.TEST_INT;
		expect(envParseInteger('TEST_INT', 7)).toBe(7);
		expect(() => envParseInteger('TEST_INT')).toThrow(/TEST_INT/);
	});

	it('parses booleans and respects defaults', () => {
		process.env.TEST_BOOL = 'true';
		expect(envParseBoolean('TEST_BOOL')).toBe(true);
		process.env.TEST_BOOL = 'false';
		expect(envParseBoolean('TEST_BOOL')).toBe(false);

		delete process.env.TEST_BOOL;
		expect(envParseBoolean('TEST_BOOL', true)).toBe(true);
		expect(() => envParseBoolean('TEST_BOOL')).toThrow(/TEST_BOOL/);
		process.env.TEST_BOOL = 'maybe';
		expect(() => envParseBoolean('TEST_BOOL')).toThrow(/boolean/);
	});

	it('parses strings and supports defaults', () => {
		process.env.TEST_STRING = 'radon';
		expect(envParseString<any>('TEST_STRING')).toBe('radon');

		delete process.env.TEST_STRING;
		expect(envParseString<any>('TEST_STRING', 'fallback')).toBe('fallback');
		expect(() => envParseString<any>('TEST_STRING')).toThrow(/TEST_STRING/);
	});

	it('parses space-delimited arrays', () => {
		process.env.TEST_ARRAY = 'alpha beta gamma';
		expect(envParseArray<any>('TEST_ARRAY')).toEqual(['alpha', 'beta', 'gamma']);

		delete process.env.TEST_ARRAY;
		expect(envParseArray<any>('TEST_ARRAY', ['default'])).toEqual(['default']);
		expect(() => envParseArray<any>('TEST_ARRAY')).toThrow(/TEST_ARRAY/);
	});

	it('detects when env keys are defined', () => {
		process.env.A = '1';
		process.env.B = '';
		expect(envIsDefined<any>('A')).toBe(true);
		expect(envIsDefined<any>('A', 'B')).toBe(false);
	});
});
