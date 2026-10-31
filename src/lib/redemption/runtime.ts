import { v2 } from '../presentation/components.js';
import { Emojis } from '#constants';
import { RadonEvents } from '#lib/types';
import type { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';
import type { ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js';
import { PrismaReceipts } from './persistence.js';
import { makeNetmarbleAdapter, maskMemberCode, RedemptionError, RedemptionService, type ClaimResult } from './service.js';
import { games } from './games.js';
import { accountLimit } from '../rewards/service.js';

const services = new WeakMap<PrismaClient, RedemptionService>();
export function redemptionService(prisma: PrismaClient) {
	let service = services.get(prisma);
	if (!service) {
		service = new RedemptionService(
			new PrismaReceipts(prisma),
			games.map((game) => makeNetmarbleAdapter(fetch, game.id)),
			10_000,
			1_000,
			10
		);
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
	memberCodes: string[],
	game = 'sololv'
) {
	let progress: ReturnType<typeof setTimeout> | undefined;
	let progressWrite: Promise<unknown> | undefined;
	try {
		const limit = memberCodes.length > 5 ? await accountLimit(container.prisma, interaction.user.id) : 5;
		const selected = memberCodes.slice(0, limit);
		// Give a useful response within the normal five-second window even when
		// the publisher is slow. This never reports unconfirmed claims as success.
		progress = setTimeout(() => {
			progressWrite = interaction
				.editReply(
					v2(
						{
							content: `Still processing ${selected.length} account(s). The game service is taking longer than usual. You can leave this message open; the final results will appear here.`,
							allowedMentions: { parse: [] }
						},
						'Coupon claim'
					)
				)
				.catch(() => null);
		}, 4_000).unref();
		const results = await redemptionService(container.prisma).claimBatch(
			interaction.user.id,
			game,
			code,
			selected.map((memberCode) => ({ memberCode }))
		);
		for (const result of results) {
			container.client.emit(RadonEvents.CodeClaim, {
				...result,
				game,
				memberCode: maskMemberCode(result.memberCode),
				userTag: interaction.user.tag,
				avatarURL: interaction.user.displayAvatarURL(),
				guild: interaction.guild?.name ?? 'Unknown guild',
				guildId: interaction.guildId ?? '',
				channel: interaction.channel && 'name' in interaction.channel ? (interaction.channel.name ?? '') : '',
				channelId: interaction.channelId ?? ''
			});
		}
		clearTimeout(progress);
		await progressWrite;
		return interaction.editReply(
			v2(
				{
					content:
						formatClaimResults(results) +
						(selected.length < memberCodes.length
							? '\nExtra accounts are still saved. Use `/claim solo` to claim for one, or `/vote` to unlock all ten slots.'
							: ''),
					allowedMentions: { parse: [] }
				},
				'Coupon claim'
			)
		);
	} catch (error) {
		if (progress) clearTimeout(progress);
		await progressWrite;
		if (!(error instanceof RedemptionError)) container.logger.error('Redemption failed before a confirmed response.');
		return interaction.editReply(
			v2(
				{
					content: error instanceof RedemptionError ? error.message : 'Redemption is temporarily unavailable. Please try again later.',
					allowedMentions: { parse: [] }
				},
				'Coupon claim'
			)
		);
	} finally {
		if (progress) clearTimeout(progress);
	}
}
