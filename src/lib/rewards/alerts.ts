import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, type Client, type MessageCreateOptions } from 'discord.js';
import { v2 } from '../presentation/components.js';
import { getGame } from '../redemption/games.js';
import { PrismaReceipts } from '../redemption/persistence.js';
import { claimButtonId } from '../redemption/posts.js';
import { receiptKey } from '../redemption/service.js';

export async function subscribeCoupons(prisma: PrismaClient, userId: string, guildId: string, game: string, enabled: boolean) {
	getGame(game);
	await prisma.couponSubscription.upsert({
		where: { id: `${guildId}:${game}:${userId}` },
		create: { id: `${guildId}:${game}:${userId}`, userId, guildId, game, enabled, createdAt: new Date() },
		update: { enabled, ...(enabled ? { createdAt: new Date() } : {}) }
	});
}

export type AlertMessage = MessageCreateOptions;

/** A leased, paginated outbox. A delivery reservation is written before sending:
 * uncertain DM outcomes are not retried and cannot produce notification storms. */
export async function deliverCouponAlerts(
	prisma: PrismaClient,
	send: (userId: string, message: AlertMessage, source: { guildId: string; channelId: string }) => Promise<unknown>,
	now = Date.now(),
	guildIds?: string[]
) {
	await prisma.couponAlert.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
	const posts = await prisma.couponAlert.findMany({
		where: { expiresAt: { gt: new Date(now) }, ...(guildIds ? { guildId: { in: guildIds } } : {}) },
		orderBy: { createdAt: 'asc' },
		take: 10
	});
	for (const post of posts) {
		const token = randomUUID();
		const locked = await prisma.$runCommandRaw({
			findAndModify: 'couponAlert',
			query: {
				_id: post.id,
				cursor: post.cursor,
				$or: [{ leaseUntil: null }, { leaseUntil: { $lte: { $date: new Date(now).toISOString() } } }]
			},
			update: { $set: { leaseToken: token, leaseUntil: { $date: new Date(now + 60_000).toISOString() } } }
		});
		if (locked.ok !== 1 || locked.writeConcernError || !locked.value) continue;
		const subscriptions = await prisma.couponSubscription.findMany({
			where: { guildId: post.guildId, game: post.game, enabled: true, createdAt: { lte: post.createdAt }, id: { gt: post.cursor } },
			orderBy: { id: 'asc' },
			take: 25
		});
		let cursor = post.cursor;
		for (const sub of subscriptions) {
			const renewed = await prisma.$runCommandRaw({
				findAndModify: 'couponAlert',
				query: { _id: post.id, leaseToken: token },
				update: { $set: { leaseUntil: { $date: new Date(Date.now() + 60_000).toISOString() } } }
			});
			if (renewed.ok !== 1 || renewed.writeConcernError || !renewed.value) break;
			if (post.expiresAt.getTime() <= Date.now()) break;
			const pass = await prisma.supporterPass.findFirst({ where: { userId: sub.userId, expiresAt: { gt: new Date() } } });
			const current = await prisma.couponSubscription.findUnique({ where: { id: sub.id } });
			if (pass && current?.enabled) {
				const id = `alert:${receiptKey(post.game, sub.userId, post.code)}`;
				const receipts = new PrismaReceipts(prisma);
				const reservation = await receipts.reserve(id, 7 * 24 * 60 * 60_000);
				if (reservation.kind === 'acquired') {
					try {
						await send(
							sub.userId,
							v2(
								{
									content: `New ${getGame(post.game).name} coupon: \`${post.code}\`\nPosted in a server you follow: ${post.messageUrl}\nUse CLAIM below. Stop alerts with \`/claim alerts enabled:False\` in that server.`,
									components: [
										new ActionRowBuilder<ButtonBuilder>().addComponents(
											new ButtonBuilder()
												.setLabel('CLAIM')
												.setStyle(ButtonStyle.Success)
												.setCustomId(claimButtonId(post.game, post.code, post.couponExpiresAt?.getTime() ?? 0))
										)
									],
									allowedMentions: { parse: [] }
								},
								'New coupon'
							),
							{ guildId: post.guildId, channelId: post.channelId }
						);
					} catch {
						/* Closed DMs and uncertain delivery are not retried. */
					}
					await receipts.finish(id, reservation.token, 'success');
				}
			}
			cursor = sub.id;
		}
		const command =
			subscriptions.length < 25 && cursor === (subscriptions.at(-1)?.id ?? post.cursor)
				? { delete: 'couponAlert', deletes: [{ q: { _id: post.id, leaseToken: token }, limit: 1 }] }
				: {
						findAndModify: 'couponAlert',
						query: { _id: post.id, leaseToken: token },
						update: { $set: { cursor, leaseUntil: null, leaseToken: null } }
					};
		const saved = await prisma.$runCommandRaw(command);
		if (saved.ok !== 1 || saved.writeConcernError) throw new Error('Coupon alert progress could not be saved');
	}
}

const workers = new WeakMap<Client, ReturnType<typeof setInterval>>();
export async function sendCouponAlert(client: Client, userId: string, message: AlertMessage, source: { guildId: string; channelId: string }) {
	const guild = client.guilds.cache.get(source.guildId);
	if (!guild?.available) return;
	const [member, channel] = await Promise.all([guild.members.fetch({ user: userId, force: true }), guild.channels.fetch(source.channelId)]);
	if (!channel?.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)) return;
	return member.send(message);
}
export function startCouponAlerts(client: Client, prisma: PrismaClient) {
	if (workers.has(client)) return;
	let running = false;
	const tick = async () => {
		if (running || !client.isReady()) return;
		running = true;
		try {
			await deliverCouponAlerts(prisma, (userId, message, source) => sendCouponAlert(client, userId, message, source), Date.now(), [
				...client.guilds.cache.keys()
			]);
		} catch {
			console.warn('Coupon alert delivery is temporarily unavailable.');
		} finally {
			running = false;
		}
	};
	workers.set(client, setInterval(() => void tick(), 15_000).unref());
	void tick();
}
export function stopCouponAlerts(client: Client) {
	const timer = workers.get(client);
	if (timer) clearInterval(timer);
	workers.delete(client);
}
