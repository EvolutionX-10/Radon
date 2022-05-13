export function pickRandom<T>(array: Array<T>) {
	if (!array) throw new Error('No array was provided!');
	return array[Math.floor(Math.random() * array.length)];
}
