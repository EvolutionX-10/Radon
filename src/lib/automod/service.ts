import { v2 } from '../presentation/components.js';
import type { automodConfig, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { GuildVerificationLevel, PermissionFlagsBits, type Guild, type GuildMember, type Message } from 'discord.js';
import { BurstDetector, FloodDetector, hasBlockedLink } from './rules.js';
import { checkedMongoResult, defaultLeaseTiming, RaidLease, type LeaseTiming } from './lease.js';

export function raidRecoveryWhere(guildIds: string[], now: Date): Prisma.automodConfigWhereInput {
	return {
		id: { in: guildIds },
		raidRestoreAt: { not: null },
		AND: [
			{ OR: [{ raidRestoreAt: { lte: now } }, { raidMode: { not: 'enforce' } }] },
			{ OR: [{ raidLeaseUntil: null }, { raidLeaseUntil: { isSet: false } }, { raidLeaseUntil: { not: null, lte: now } }] }
		]
	};
}

export class AutoModService {
	private readonly configs = new Map<string, { expires: number; value: Promise<automodConfig | null> }>();
	private readonly alerts = new Map<string, number>();
	private readonly raids = new Map<string, Promise<void>>();
	private readonly joins = new Map<string, Promise<void>>();
	private readonly flood = new FloodDetector();
	private readonly bursts = new BurstDetector();

	public constructor(private readonly timing: LeaseTiming = defaultLeaseTiming) {
		if (
			timing.leaseMilliseconds <= 0 ||
			timing.renewMilliseconds <= 0 ||
			timing.renewMilliseconds >= timing.leaseMilliseconds / 2 ||
			timing.retryMilliseconds <= 0
		)
			throw new Error('Invalid AutoMod lease timing.');
	}

	public invalidate(guildId: string) {
		this.configs.delete(guildId);
	}

	public getConfig(prisma: PrismaClient, guildId: string): Promise<automodConfig | null> {
		const cached = this.configs.get(guildId);
		if (cached && cached.expires > Date.now()) return cached.value;
		const value = prisma.automodConfig.findUnique({ where: { id: guildId } }).catch((error: unknown) => {
			this.configs.delete(guildId);
			throw error;
		});
		this.configs.delete(guildId);
		this.configs.set(guildId, { expires: Date.now() + 15_000, value });
		while (this.configs.size > 2000) this.configs.delete(this.configs.keys().next().value!);
		return value;
	}

	private exempt(member: GuildMember, channelId: string, parentId: string | null, config: automodConfig): boolean {
		return (
			member.id === member.guild.ownerId ||
			member.permissions.has(PermissionFlagsBits.ManageMessages) ||
			config.exemptChannelIds.includes(channelId) ||
			(!!parentId && config.exemptChannelIds.includes(parentId)) ||
			member.roles.cache.some((role) => config.exemptRoleIds.includes(role.id))
		);
	}

	private shouldAlert(key: string): boolean {
		const now = Date.now();
		if ((this.alerts.get(key) ?? 0) > now) return false;
		this.alerts.delete(key);
		this.alerts.set(key, now + 30_000);
		while (this.alerts.size > 10_000) this.alerts.delete(this.alerts.keys().next().value!);
		return true;
	}

	public async alert(guild: Guild, channelId: string, content: string) {
		const channel = await guild.channels.fetch(channelId);
		if (!channel?.isTextBased() || !channel.isSendable()) throw new Error('AutoMod alert channel is unavailable.');
		await channel.send(v2({ content, allowedMentions: { parse: [] } }, 'AutoMod alert'));
	}

	public async message(prisma: PrismaClient, message: Message, edited = false): Promise<void> {
		if (!message.inGuild() || message.author.bot || message.webhookId || !message.member || message.partial) return;
		const config = await this.getConfig(prisma, message.guildId);
		if (!config || this.exempt(message.member, message.channelId, message.channel.isThread() ? message.channel.parentId : null, config)) return;
		const hits: { rule: string; enforce: boolean }[] = [];
		if (!edited && config.floodMode !== 'off') {
			const reasons = this.flood.inspect(
				{
					guildId: message.guildId,
					userId: message.author.id,
					id: message.id,
					channelId: message.channelId,
					content: message.content,
					at: Date.now()
				},
				config
			);
			if (reasons.length) hits.push({ rule: reasons.join(', '), enforce: config.floodMode === 'enforce' });
		}
		if (config.linkMode !== 'off' && hasBlockedLink(message.content, config))
			hits.push({ rule: 'blocked domain or Discord invite', enforce: config.linkMode === 'enforce' });
		if (!hits.length) return;
		let outcome = 'Observation only; no action taken.';
		if (hits.some((hit) => hit.enforce)) {
			try {
				if (!message.deletable) throw new Error('missing permission');
				await message.delete();
				outcome = 'Message deleted.';
			} catch {
				outcome = 'Deletion failed; check Manage Messages and channel permissions.';
			}
		}
		if (this.shouldAlert(`message:${message.guildId}:${message.author.id}`)) {
			await this.alert(
				message.guild,
				config.alertChannelId,
				`AutoMod: ${hits.map((hit) => hit.rule).join('; ')}\nMember: ${message.author.id}\nChannel: ${message.channelId}\nMessage: ${message.url}\n${outcome}`
			);
		}
	}

	private async withRaidLock(guildId: string, operation: () => Promise<void>): Promise<void> {
		const previous = this.raids.get(guildId) ?? Promise.resolve();
		const next = previous.catch(() => undefined).then(operation);
		this.raids.set(guildId, next);
		try {
			await next;
		} finally {
			if (this.raids.get(guildId) === next) this.raids.delete(guildId);
		}
	}

	public async join(prisma: PrismaClient, member: GuildMember): Promise<void> {
		if (member.user.bot || this.joins.has(member.guild.id)) return;
		const config = await this.getConfig(prisma, member.guild.id);
		if (
			this.joins.has(member.guild.id) ||
			!config ||
			config.raidMode === 'off' ||
			!this.bursts.inspect(member.guild.id, Date.now(), config.raidThreshold, config.raidWindowSeconds)
		)
			return;
		// Once a burst is detected, further joins share that work instead of
		// adding an unbounded promise queue while Discord REST is delayed.
		const operation = this.withRaidLock(member.guild.id, async () => {
			if (config.raidMode === 'observe') {
				if (this.shouldAlert(`raid:${member.guild.id}`))
					await this.alert(
						member.guild,
						config.alertChannelId,
						`AutoMod observed a join burst: at least ${config.raidThreshold} joins within ${config.raidWindowSeconds}s. No restriction applied.`
					);
				return;
			}
			const guild = await member.guild.fetch();
			if (guild.verificationLevel === GuildVerificationLevel.VeryHigh) return;
			const originalLevel = guild.verificationLevel;
			const restoreAt = new Date(Date.now() + config.raidDurationSeconds * 1000);
			const leaseUntil = new Date(Date.now() + this.timing.leaseMilliseconds);
			const token = randomUUID();
			// The same durable lease protects apply and restore. Persist the
			// snapshot before making any Discord mutation.
			const claimed = checkedMongoResult(
				await prisma.$runCommandRaw({
					findAndModify: 'automodConfig',
					query: { _id: guild.id, raidMode: 'enforce', raidRestoreAt: null },
					update: {
						$set: {
							raidRestoreLevel: guild.verificationLevel,
							raidRestoreAt: { $date: restoreAt.toISOString() },
							raidLeaseToken: token,
							raidLeaseUntil: { $date: leaseUntil.toISOString() },
							updatedAt: { $date: new Date().toISOString() }
						}
					},
					new: false
				})
			);
			if (!claimed.value) return;
			const lease = new RaidLease(prisma, guild.id, token, leaseUntil, this.timing);
			let restoredDuringApply = false;
			this.invalidate(guild.id);
			try {
				await lease.assertOwned();
				await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, 'Radon AutoMod join burst');
				await lease.assertOwned();
				const desired = await prisma.automodConfig.findUnique({ where: { id: guild.id } });
				// A disable request or expiry that happened while apply was in
				// flight is reconciled before releasing the apply lease.
				if (desired?.raidMode !== 'enforce' || (desired.raidRestoreAt?.getTime() ?? restoreAt.getTime()) <= Date.now()) {
					await lease.assertOwned();
					const current = await guild.fetch();
					if (current.verificationLevel === GuildVerificationLevel.VeryHigh) {
						await lease.assertOwned();
						await current.setVerificationLevel(originalLevel, 'Radon AutoMod restriction canceled during apply');
					}
					await lease.complete({ raidRestoreAt: null, raidRestoreLevel: null });
					restoredDuringApply = true;
				} else await lease.complete({});
			} catch (error) {
				// A lost response can mean the mutation happened. Preserve the
				// snapshot and delay automatic recovery rather than clearing it.
				await lease.defer(this.timing.leaseMilliseconds).catch(() => undefined);
				throw error;
			} finally {
				await lease.stop();
				this.invalidate(guild.id);
			}
			await this.alert(
				guild,
				config.alertChannelId,
				restoredDuringApply
					? 'AutoMod detected a join burst, but protection expired or was disabled while applying. The previous verification setting was restored.'
					: `AutoMod detected a join burst. Verification restriction deadline: ${restoreAt.toISOString()}. Existing role holders are unaffected. Use /automod raid mode:off to restore early.`
			);
		});
		this.joins.set(member.guild.id, operation);
		try {
			await operation;
		} finally {
			if (this.joins.get(member.guild.id) === operation) this.joins.delete(member.guild.id);
		}
	}

	public async restoreRaid(prisma: PrismaClient, guild: Guild, force = false): Promise<void> {
		await this.withRaidLock(guild.id, async () => {
			const now = new Date();
			const token = randomUUID();
			const leaseUntil = new Date(now.getTime() + this.timing.leaseMilliseconds);
			const claimed = checkedMongoResult(
				await prisma.$runCommandRaw({
					findAndModify: 'automodConfig',
					query: {
						_id: guild.id,
						raidRestoreAt: force ? { $ne: null } : { $lte: { $date: now.toISOString() }, $ne: null },
						$or: [
							{ raidLeaseUntil: null },
							{ raidLeaseUntil: { $lte: { $date: now.toISOString() } } },
							...(force ? [{ raidLeaseToken: null }] : [])
						]
					},
					update: { $set: { raidLeaseToken: token, raidLeaseUntil: { $date: leaseUntil.toISOString() } } },
					new: false
				})
			);
			const config = claimed.value as { raidRestoreLevel?: number } | null;
			if (!config) return;
			const lease = new RaidLease(prisma, guild.id, token, leaseUntil, this.timing);
			try {
				if (typeof config.raidRestoreLevel !== 'number' || config.raidRestoreLevel < 0 || config.raidRestoreLevel > 4)
					throw new Error('Invalid saved verification level.');
				await lease.assertOwned();
				const current = await guild.fetch();
				if (current.verificationLevel === GuildVerificationLevel.VeryHigh) {
					await lease.assertOwned();
					await current.setVerificationLevel(config.raidRestoreLevel, 'Radon AutoMod raid protection expired');
				}
				await lease.complete({ raidRestoreAt: null, raidRestoreLevel: null });
				this.invalidate(guild.id);
			} catch (error) {
				await lease.defer().catch(() => undefined);
				throw error;
			} finally {
				await lease.stop();
			}
		});
	}

	public sweep() {
		const now = Date.now();
		this.flood.sweep(now);
		this.bursts.sweep(now);
		for (const [key, expires] of this.alerts) if (expires <= now) this.alerts.delete(key);
		for (const [key, cached] of this.configs) if (cached.expires <= now) this.configs.delete(key);
	}
}

export const autoModService = new AutoModService();
