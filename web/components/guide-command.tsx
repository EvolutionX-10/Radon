'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function GuideCommand({ command }: { command: string }) {
	const [status, setStatus] = useState('');
	async function copy() {
		try {
			await navigator.clipboard.writeText(command);
			setStatus('Copied. Replace the example values in Discord.');
		} catch {
			setStatus('Select the command text to copy it manually.');
		}
	}
	return (
		<div className="handbook-command">
			<div>
				<code>{command}</code>
				<button type="button" onClick={copy} aria-label={`Copy ${command}`} title="Copy example">
					{status.startsWith('Copied') ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
				</button>
			</div>
			<span role="status">{status}</span>
		</div>
	);
}
