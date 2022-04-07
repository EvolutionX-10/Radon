// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pickRandom(array: Array<any>) {
	if (!array) throw new Error('No array was provided!');
	return array[Math.floor(Math.random() * array.length)];
}
