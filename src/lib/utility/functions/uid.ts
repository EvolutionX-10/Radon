/**
 * It returns a string that is a combination of the current time in milliseconds and a random string of
 * 8 characters
 * @returns A string of random characters.
 */
export function uid() {
	return Date.now().toString(32) + Math.random().toString(32).substring(2, 10);
}
