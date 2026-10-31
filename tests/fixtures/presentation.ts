export function displayText(payload: any): string {
	if (typeof payload === 'string') return payload;
	const parts: string[] = payload?.content ? [payload.content] : [];
	const visit = (items: any[]) => {
		for (const item of items ?? []) {
			const data = item.toJSON?.() ?? item;
			if (data.content) parts.push(data.content);
			if (data.components) visit(data.components);
		}
	};
	visit(payload?.components);
	return parts.join('\n');
}
