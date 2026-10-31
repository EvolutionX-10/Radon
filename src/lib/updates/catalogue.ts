import entries from '../../../shared/updates.json' with { type: 'json' };

export interface UpdateEntry {
	id: string;
	date: string;
	title: string;
	summary: string;
	changes: readonly string[];
}

/** Newest first; this manifest also powers the website's update history. */
export const updates: readonly UpdateEntry[] = entries;

export function findUpdate(id?: string | null) {
	return id ? updates.find((entry) => entry.id === id) : updates[0];
}

export function updateChoices(query: string, catalogue: readonly UpdateEntry[] = updates) {
	const search = query.trim().toLowerCase();
	return catalogue
		.filter((entry) => `${entry.title} ${entry.date} ${entry.id}`.toLowerCase().includes(search))
		.slice(0, 25)
		.map((entry) => ({ name: `${entry.date} · ${entry.title}`.slice(0, 100), value: entry.id }));
}
