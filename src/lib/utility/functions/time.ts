/**
 * Time Formatter
 * @param ms milliseconds to format
 */
export function formatDuration(ms: number): string {
    if (!ms) return `\u200b\u200b`;
    const pad = (n: number, z = 2) => ('00' + n).slice(-z),
        hours = pad((ms / 3.6e6) | 0),
        minutes = pad(((ms % 3.6e6) / 6e4) | 0);
    return `${+hours ? hours + ':' : ''}${+minutes ? minutes + ':' : ''}${pad(
        ((ms % 6e4) / 1000) | 0
    )}`;
}
