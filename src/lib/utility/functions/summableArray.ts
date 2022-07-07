/**
 * It takes a maximum number and a part number, and returns an array of numbers that add up to the
 * maximum number, with each number in the array being no greater than the part number
 * @param {number} maximum - The maximum number of items in the array.
 * @param {number} part - The maximum amount of the sum that can be added at once.
 * @returns An array of numbers that sum up to the maximum number.
 */
export function summableArray(maximum: number, part: number) {
	const arr = [];
	let current = 0;

	while (current < maximum) {
		const next = Math.min(part, maximum - current);
		arr.push(next);
		current += next;
	}

	return arr;
}
