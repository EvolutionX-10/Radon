import type { PrismaClient } from '@prisma/client';
import { MessageFlags, type Interaction } from 'discord.js';
import { Owners } from '#constants';
import { v2 } from '../presentation/components.js';

/** Run before raw interaction listeners, including Discord collectors, receive an event. */
export async function allowBotInteraction(prisma: Pick<PrismaClient, 'bugReporter'>, interaction: Interaction, timeoutMs = 1500): Promise<boolean> {
	if (Owners.includes(interaction.user.id)) return true;
	let denial: string | undefined;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		const reporter = await Promise.race([
			prisma.bugReporter.findUnique({ where: { id: interaction.user.id } }),
			new Promise<never>((_resolve, reject) => {
				timeout = setTimeout(() => reject(new Error('Access lookup timed out')), timeoutMs);
			})
		]);
		if (reporter?.banned) denial = 'You are banned from using Radon.';
	} catch {
		denial = 'Bot access could not be checked. Please try again.';
	} finally {
		clearTimeout(timeout);
	}
	if (!denial) return true;
	try {
		if (interaction.isAutocomplete()) await interaction.respond([]);
		else if (interaction.isRepliable()) await interaction.reply(v2({ content: denial, flags: MessageFlags.Ephemeral }, 'Radon unavailable'));
	} catch {
		// Expired interaction tokens cannot bypass the ban or cause an unhandled rejection.
	}
	return false;
}
