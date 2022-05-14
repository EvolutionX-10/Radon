import { lstatSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export function countlines(path: string) {
	let linesOfCode = 0;
	let numOfFiles = 0;
	function lines(dir: string) {
		const files = readdirSync(dir);
		for (const file of files) {
			const stat = lstatSync(join(dir, file));
			if (stat.isDirectory()) {
				lines(join(dir, file));
			} else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.d.ts') || file.endsWith('.js.map')) {
				const buffer = readFileSync(join(dir, file)).toString();
				const lines = buffer.split('\n');
				linesOfCode += lines.length;
				numOfFiles++;
			}
		}
	}

	if (linesOfCode === 0) lines(join(process.cwd(), path));

	return {
		linesOfCode,
		numOfFiles
	};
}
