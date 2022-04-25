/**
 * Time Formatter
 * @param ms milliseconds to format
 */
export function formatDuration(ms: number): string {
	if (!ms) return `\u200b\u200b`;
	const pad = (n: number, z = 2) => `00${n}`.slice(-z);
	const hours = pad((ms / 3.6e6) | 0);
	const minutes = pad(((ms % 3.6e6) / 6e4) | 0);
	return `${Number(hours) ? `${hours}:` : ''}${Number(minutes) ? `${minutes}:` : ''}${pad(((ms % 6e4) / 1000) | 0)}`;
}
