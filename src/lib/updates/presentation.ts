import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { card, divider, text } from '#lib/presentation/components.js';
import type { UpdateEntry } from './catalogue.js';

export const updatesUrl = 'https://radon-lake-phi.vercel.app/updates';

export function updateCard(entry: UpdateEntry) {
	const panel = card(entry.title, `${entry.date} · What's new in Radon`);
	text(panel, entry.summary);
	divider(panel);
	text(panel, entry.changes.map((change) => `- ${change}`).join('\n'));
	text(panel, '-# Choose a release in /updates to read an older update. Found a problem? Use /bug.');
	panel.addActionRowComponents((row) =>
		row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('All updates').setURL(updatesUrl))
	);
	return panel;
}
