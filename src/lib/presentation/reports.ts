import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { card, date, divider, person, safe, text, type Identity } from './components.js';

interface ReportDisplay {
	id: string;
	excerpt: string;
	messageUrl: string;
	status?: string;
	createdAt?: Date;
}
export function reportContainer(report: ReportDisplay, author: Identity, reporter: Identity, controls = false) {
	const panel = card('Message report', `**${report.status ?? 'pending'}** · Private staff review`);
	person(panel, 'Reported member', author);
	person(panel, 'Reported by', reporter);
	divider(panel);
	text(panel, `### Reported message\n${safe(report.excerpt, 1000)}`);
	panel.addActionRowComponents((row) =>
		row.addComponents(new ButtonBuilder().setLabel('Open original message').setStyle(ButtonStyle.Link).setURL(report.messageUrl))
	);
	if (controls)
		panel.addActionRowComponents((row) =>
			row.addComponents(
				new ButtonBuilder().setCustomId(`report:dismiss:${report.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary),
				new ButtonBuilder().setCustomId(`report:timeout:${report.id}`).setLabel('Timeout 10 minutes').setStyle(ButtonStyle.Danger)
			)
		);
	divider(panel);
	text(panel, `-# Report reference: \`${report.id}\`${report.createdAt ? ` · ${date(report.createdAt)}` : ''}`);
	return panel;
}
