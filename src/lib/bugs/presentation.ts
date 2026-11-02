import type { bugReport } from '@prisma/client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { accents, card, componentMessage, date, divider, safe, text } from '../presentation/components.js';
import { BUG_WARNING } from './service.js';

export function bugWarning(userId: string) {
	const panel = card('Report a bug', 'Send a private report directly to the Radon owner.', accents.warning);
	text(panel, `${BUG_WARNING}\n\nDescribe the command, steps to reproduce, expected result, and what happened. One report every 10 minutes.`);
	panel.addActionRowComponents(
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`bug:open:${userId}`).setLabel('I understand · Report a bug').setStyle(ButtonStyle.Primary)
		)
	);
	return { ...componentMessage(panel), flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 };
}

export function bugReportCard(report: bugReport) {
	const panel = card('Bug report', `**${safe(report.status, 20)}** · ${date(report.createdAt)}`);
	text(panel, `### ${safe(report.summary, 240)}\n${safe(report.details, 2000)}`);
	divider(panel);
	text(
		panel,
		`Reporter: <@${report.reporterId}>\n-# User ID: \`${report.reporterId}\` · Server ID: \`${report.guildId}\` · Channel ID: \`${report.channelId}\`\n-# Report reference: \`${report.id}\``
	);
	if (report.reviewedAt) text(panel, `Reviewed ${date(report.reviewedAt)} by <@${report.reviewerId}>\n${safe(report.reviewNote ?? '', 600)}`);
	return componentMessage(panel);
}

export function bugInbox(reports: bugReport[], status: string, next: string | null) {
	const panel = card('Bug report inbox', `${safe(status, 20)} · Newest first`);
	if (!reports.length) text(panel, 'No reports found.');
	for (const report of reports) {
		divider(panel);
		text(panel, `**${safe(report.summary, 150)}**\n<@${report.reporterId}> · ${date(report.createdAt)}\n-# Report reference: \`${report.id}\``);
	}
	text(
		panel,
		`Use /bugreports view with a report reference to read the details.${next ? `\nNext page: /bugreports list status:${status} before:${next}` : ''}`
	);
	return componentMessage(panel);
}
