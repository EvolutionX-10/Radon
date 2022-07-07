/**
 * It takes an array of strings, splits each string by underscores, capitalizes the first letter of
 * each word, and joins them back together
 * @param {string[]} array - The array of strings to format.
 * @returns An array of strings.
 * @example
 * format(['SEND_MESSAGES']) -> ['Send Messages']
 */
export function format(array: string[]) {
	return array
		.map((e) =>
			e
				.split(`_`)
				.map((i) => i[0] + i.match(/\B(\w+)/)?.[1]?.toLowerCase())
				.join(` `)
		)
		.map((s) => {
			s = s.replace('Tts', 'TTS');
			s = s.replace('Vad', 'VAD');
			return s;
		});
}
