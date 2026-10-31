import { randomUUID } from 'node:crypto';
import type { PrismaClient, moderationScheduledBan } from '@prisma/client';
import { Routes, type Client, type Guild } from 'discord.js';
import { atomicUpdate, mongoDate } from './atomicUpdate.js';
import { RadonEvents } from '#lib/types';

export const banTaskId = (guildId: string, targetId: string) => `${guildId}:${targetId}`;
export const temporaryBanReason = (reason: string, generation: string) => `${reason.slice(0, 400)} [Radon temporary ban ${generation}]`;

export class TemporaryBans {
	private running = false;
	private stopped = false;
	private timer?: ReturnType<typeof setInterval>;

	public constructor(
		private readonly prisma: PrismaClient,
		private readonly client: Client,
		private readonly log: (error: unknown) => void = console.error,
		private readonly clock: () => Date = () => new Date()
	) {}

	public async prepare(guildId: string, targetId: string, actorId: string, reason: string, dueAt: Date) {
		const id = banTaskId(guildId, targetId);
		const generation = randomUUID();
		// Terminal task cleanup is safe: the primary key still arbitrates simultaneous new requests.
		const cleanup = await this.prisma.$runCommandRaw({
			findAndModify: 'moderationScheduledBan',
			query: { _id: id, status: { $in: ['completed', 'cancelled', 'superseded'] } },
			remove: true
		});
		if (cleanup.ok !== 1 || cleanup.writeConcernError) throw new Error('Previous task cleanup could not be confirmed');
		return this.prisma.moderationScheduledBan.create({
			data: {
				id,
				generation,
				guildId,
				targetId,
				actorId,
				expectedReason: temporaryBanReason(reason, generation),
				dueAt,
				status: 'preparing',
				nextAttemptAt: dueAt
			}
		});
	}

	public cancel(guildId: string, targetId: string, now = new Date()) {
		return atomicUpdate(
			this.prisma,
			'moderationScheduledBan',
			{
				_id: banTaskId(guildId, targetId),
				status: { $in: ['preparing', 'scheduled'] },
				$or: [{ leaseUntil: null }, { leaseUntil: { $lte: mongoDate(now) } }]
			},
			{ $set: { status: 'cancelled', completedAt: mongoDate(now) } }
		);
	}

	public start() {
		if (this.timer) return;
		this.stopped = false;
		this.timer = setInterval(() => void this.tick().catch(this.log), 30_000);
		this.timer.unref();
		void this.tick().catch(this.log);
	}

	public stop() {
		this.stopped = true;
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
	}

	public async tick(now = this.clock()) {
		if (this.running || this.stopped) return;
		this.running = true;
		try {
			const tasks = await this.prisma.moderationScheduledBan.findMany({
				where: {
					guildId: { in: [...this.client.guilds.cache.keys()] },
					status: { in: ['scheduled', 'preparing'] },
					nextAttemptAt: { lte: now },
					OR: [{ leaseUntil: null }, { leaseUntil: { isSet: false } }, { leaseUntil: { lte: now } }]
				},
				orderBy: { nextAttemptAt: 'asc' },
				take: 20
			});
			for (const task of tasks) {
				if (this.stopped) break;
				if (!this.client.guilds.cache.has(task.guildId)) continue; // The owning shard processes its guilds.
				try {
					await this.process(task, this.clock());
				} catch (error) {
					this.log(error);
				}
			}
		} finally {
			this.running = false;
		}
	}

	public async process(task: moderationScheduledBan, now = this.clock()) {
		if (this.stopped || task.dueAt > now) return;
		const token = randomUUID();
		const ownsLease = await atomicUpdate(
			this.prisma,
			'moderationScheduledBan',
			{
				_id: task.id,
				generation: task.generation,
				status: { $in: ['scheduled', 'preparing'] },
				nextAttemptAt: { $lte: mongoDate(now) },
				$or: [{ leaseUntil: null }, { leaseUntil: { $lte: mongoDate(now) } }]
			},
			{ $set: { leaseOwner: token, leaseUntil: mongoDate(new Date(now.getTime() + 10 * 60_000)) } }
		);
		if (!ownsLease) return;
		try {
			const guild = await this.client.guilds.fetch(task.guildId);
			const ban = await this.fetchBan(guild, task.targetId);
			if (!ban) {
				if (task.status === 'preparing')
					return this.retry(task, token, this.clock(), 'No matching ban yet; the original request may have been interrupted.');
				return this.complete(task, token, 'cancelled', this.clock());
			}
			if (ban.reason !== task.expectedReason) return this.complete(task, token, 'superseded', this.clock());
			// Slow reads must not lead to a write after another worker can acquire the lease.
			const beforeWrite = this.clock();
			const renewed = await atomicUpdate(
				this.prisma,
				'moderationScheduledBan',
				{
					_id: task.id,
					generation: task.generation,
					leaseOwner: token,
					status: { $in: ['scheduled', 'preparing'] },
					leaseUntil: { $gt: mongoDate(beforeWrite) }
				},
				{ $set: { leaseUntil: mongoDate(new Date(beforeWrite.getTime() + 10 * 60_000)) } }
			);
			if (!renewed || this.stopped || new Date(beforeWrite.getTime() + 10 * 60_000).getTime() - this.clock().getTime() <= 61_000) return;
			// The REST signal cancels a queued request as well as an in-flight HTTP request.
			await this.client.rest.delete(Routes.guildBan(guild.id, task.targetId), {
				reason: `Temporary ban expired (${task.generation})`,
				signal: AbortSignal.timeout(60_000)
			});
			guild.bans.cache.delete(task.targetId);
			const moderator = guild.members.me;
			if (moderator)
				this.client.emit(RadonEvents.ModAction, {
					action: 'unban',
					moderator,
					target: ban.user,
					reason: `Temporary ban expired (${task.generation})`
				});
			await this.complete(task, token, 'completed', this.clock());
		} catch (error) {
			await this.retry(task, token, this.clock(), error instanceof Error ? error.message : 'Unknown scheduler error');
			throw error;
		}
		return;
	}

	private async fetchBan(guild: Guild, userId: string) {
		try {
			return await guild.bans.fetch({ user: userId, force: true });
		} catch (error) {
			if ((error as { code?: number }).code === 10026) return null;
			throw error;
		}
	}

	private complete(task: moderationScheduledBan, token: string, status: string, now: Date) {
		return atomicUpdate(
			this.prisma,
			'moderationScheduledBan',
			{ _id: task.id, generation: task.generation, leaseOwner: token, leaseUntil: { $gt: mongoDate(now) } },
			{
				$set: { status, completedAt: mongoDate(now), leaseOwner: null, leaseUntil: null, lastError: null }
			}
		);
	}
	private retry(task: moderationScheduledBan, token: string, now: Date, error: string) {
		return atomicUpdate(
			this.prisma,
			'moderationScheduledBan',
			{ _id: task.id, generation: task.generation, leaseOwner: token, leaseUntil: { $gt: mongoDate(now) } },
			{
				$set: {
					nextAttemptAt: mongoDate(new Date(now.getTime() + 5 * 60_000)),
					leaseOwner: null,
					leaseUntil: null,
					lastError: error.slice(0, 500)
				}
			}
		);
	}
}

const workers = new WeakMap<Client, TemporaryBans>();
export function startTemporaryBanWorker(prisma: PrismaClient, client: Client, log: (error: unknown) => void) {
	workers.get(client)?.stop();
	const worker = new TemporaryBans(prisma, client, log);
	workers.set(client, worker);
	worker.start();
	return worker;
}
export function stopTemporaryBanWorker(client: Client) {
	workers.get(client)?.stop();
	workers.delete(client);
}

export interface BanDispatchLease {
	id: string;
	generation: string;
	owner: string;
	kind: 'initial' | 'replacement';
	previousStatus: string;
	dueAt: Date;
	leaseUntil: Date;
}

/** Reserve the existing schedule until Discord confirms whether a replacement was applied. */
export async function guardScheduledBanReplacement(
	prisma: PrismaClient,
	guildId: string,
	targetId: string,
	reason: string,
	temporaryGeneration?: string,
	now = new Date()
): Promise<BanDispatchLease | undefined> {
	const id = banTaskId(guildId, targetId);
	const task = await prisma.moderationScheduledBan.findUnique({ where: { id } });
	if (temporaryGeneration) {
		if (!task || task.generation !== temporaryGeneration || task.expectedReason !== reason || task.status !== 'preparing') {
			throw new Error('Temporary ban preparation was cancelled or replaced. No ban was submitted.');
		}
	} else if (!task || !['preparing', 'scheduled'].includes(task.status)) return undefined;
	const owner = randomUUID();
	const leaseUntil = new Date(now.getTime() + 10 * 60_000);
	const reserved = await atomicUpdate(
		prisma,
		'moderationScheduledBan',
		{
			_id: id,
			generation: task!.generation,
			status: task!.status,
			...(temporaryGeneration ? { expectedReason: reason } : {}),
			$or: [{ leaseUntil: null }, { leaseUntil: { $lte: mongoDate(now) } }]
		},
		{ $set: { leaseOwner: owner, leaseUntil: mongoDate(leaseUntil) } }
	);
	if (!reserved)
		throw new Error('A temporary-ban expiry or dispatch is being processed or changed concurrently. Check its outcome before replacing the ban.');
	return {
		id,
		generation: task!.generation,
		owner,
		leaseUntil,
		dueAt: task!.dueAt,
		previousStatus: task!.status,
		kind: temporaryGeneration ? 'initial' : 'replacement'
	};
}

export function banDispatchReason(lease: BanDispatchLease, reason: string) {
	// Even a copied old marker must be distinguishable after an unknown replacement outcome.
	return lease.kind === 'initial' ? reason : `${reason.slice(0, 400)} [Radon replacement ban ${lease.owner}]`;
}

export function assertBanDispatchWindow(lease: BanDispatchLease, now = new Date()) {
	if (lease.leaseUntil.getTime() - now.getTime() <= 61_000) throw new Error('Ban dispatch lease expired before the request could be submitted.');
}

export function finishBanDispatch(prisma: PrismaClient, lease: BanDispatchLease, now = new Date()) {
	return atomicUpdate(
		prisma,
		'moderationScheduledBan',
		{
			_id: lease.id,
			generation: lease.generation,
			leaseOwner: lease.owner,
			status: lease.previousStatus,
			leaseUntil: { $gt: mongoDate(now) }
		},
		{
			$set: {
				status: lease.kind === 'initial' ? 'scheduled' : 'cancelled',
				leaseOwner: null,
				leaseUntil: null,
				...(lease.kind === 'replacement' ? { completedAt: mongoDate(now) } : {}),
				lastError: null
			}
		}
	);
}

/** A definite rejection retains the original schedule; uncertain writes retain their reservation for reconciliation. */
export function recoverBanDispatch(prisma: PrismaClient, lease: BanDispatchLease, error: unknown, definiteFailure: boolean, now = new Date()) {
	const nextAttempt = new Date(
		Math.max(lease.dueAt.getTime(), definiteFailure ? now.getTime() + 30_000 : Math.max(lease.leaseUntil.getTime(), now.getTime() + 5 * 60_000))
	);
	return atomicUpdate(
		prisma,
		'moderationScheduledBan',
		{
			_id: lease.id,
			generation: lease.generation,
			leaseOwner: lease.owner,
			status: lease.previousStatus
		},
		{
			$set: {
				nextAttemptAt: mongoDate(nextAttempt),
				lastError: (error instanceof Error ? error.message : 'Unknown dispatch outcome').slice(0, 500),
				...(definiteFailure ? { leaseOwner: null, leaseUntil: null } : {})
			}
		}
	);
}
