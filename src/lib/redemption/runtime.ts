import { Emojis } from '#constants';
import { RadonEvents } from '#lib/types';
import type { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';
import type { ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js';
import { PrismaReceipts } from './persistence.js';
import { makeNetmarbleAdapter, maskMemberCode, RedemptionError, RedemptionService, type ClaimResult } from './service.js';

const services = new WeakMap<PrismaClient, RedemptionService>();
export function redemptionService(prisma: PrismaClient) {
	let service = services.get(prisma);
	if (!service) {
		service = new RedemptionService(new PrismaReceipts(prisma), [makeNetmarbleAdapter()]);
		services.set(prisma, service);
	}
	return service;
}
export function formatClaimResults(results: ClaimResult[]) {
	const succeeded = results.filter((result) => result.success).length;
	const alreadyClaimed = results.filter((result) => result.status === 'already_claimed').length;
	const failed = results.filter((result) => !result.success && result.status !== 'already_claimed');
	const content: string[] = [];
	if (succeeded) content.push(`${Emojis.Confirm} Claimed in **${succeeded}** account(s).`);
	if (alreadyClaimed) content.push(`Already redeemed through Radon in **${alreadyClaimed}** account(s).`);
	if (failed.length)
		content.push(
			`${Emojis.Cross} Could not confirm redemption in **${failed.length}** account(s).`,
			...failed.map((result) => `• \`${maskMemberCode(result.memberCode)}\`: ${result.message}`)
		);
	return content.join('\n') || 'No accounts were selected.';
}
export async function runClaims(
	interaction: ButtonInteraction | ChatInputCommandInteraction | ModalSubmitInteraction,
	code: string,
	memberCodes: string[]
) {
	try {
		const results = await redemptionService(container.prisma).claimBatch(
			interaction.user.id,
			'sololv',
			code,
			memberCodes.map((memberCode) => ({ memberCode }))
		);
		for (const result of results) {
			container.client.emit(RadonEvents.CodeClaim, {
				...result,
				memberCode: maskMemberCode(result.memberCode),
				userTag: interaction.user.tag,
				avatarURL: interaction.user.displayAvatarURL(),
				guild: interaction.guild?.name ?? 'Unknown guild',
				guildId: interaction.guildId ?? '',
				channel: interaction.channel && 'name' in interaction.channel ? (interaction.channel.name ?? '') : '',
				channelId: interaction.channelId ?? ''
			});
		}
		return interaction.editReply({ content: formatClaimResults(results), allowedMentions: { parse: [] } });
	} catch (error) {
		if (!(error instanceof RedemptionError)) container.logger.error('Redemption failed before a confirmed response.');
		return interaction.editReply({
			content: error instanceof RedemptionError ? error.message : 'Redemption is temporarily unavailable. Please try again later.',
			allowedMentions: { parse: [] }
		});
	}
}
