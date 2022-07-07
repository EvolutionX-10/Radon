/**
 * It waits for a specified number of milliseconds
 * @param {number} ms - The number of milliseconds to wait.
 * @returns A promise that resolves after the specified number of milliseconds.
 */
export async function wait(ms: number): Promise<void> {
	return (await import('node:util')).promisify(setTimeout)(ms);
}
