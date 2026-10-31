import type { PrismaClient } from '@prisma/client';
import type { RadonClient } from '../RadonClient.js';
import { LockExpiryWorker } from './expiry.js';
import { LockService } from './LockService.js';
import { lockStore } from './store.js';
import { channelTarget, roleTarget, threadTarget, SERVER_FLAGS } from './targets.js';

export function createLockExpiryWorker(client: RadonClient, prisma: PrismaClient, error: (error: unknown) => void) {
	const service = new LockService(lockStore(prisma));
	return new LockExpiryWorker({
		listDue: async () => {
			const now = new Date();
			return prisma.channelLockSnapshot.findMany({
				where: {
					guildId: { in: [...client.guilds.cache.keys()] },
					expiresAt: { not: null, lte: now },
					OR: [{ retryAfter: null }, { retryAfter: { isSet: false } }, { retryAfter: { lte: now } }]
				},
				orderBy: { expiresAt: 'asc' },
				take: 50
			});
		},
		restore: async (record) => {
			const guild = client.guilds.cache.get(record.guildId);
			if (!guild) return 'busy';
			const target =
				record.kind === 'channel'
					? channelTarget(guild, record.targetId, record.roleId, SERVER_FLAGS)
					: record.kind === 'role'
						? roleTarget(guild, record.roleId)
						: record.kind === 'thread'
							? threadTarget(guild, record.targetId)
							: null;
			if (!target) throw new Error(`Unsupported saved lock kind: ${record.kind}`);
			return service.unlock(target, 'Temporary lock expired; restoring saved permissions');
		},
		defer: async (record, until) => {
			// Match the original generation, so a replacement lock is never postponed.
			const result = await prisma.$runCommandRaw({
				update: 'channelLockSnapshot',
				updates: [
					{
						q: { _id: record.id, createdAt: { $date: record.createdAt.toISOString() } },
						u: { $set: { retryAfter: { $date: until.toISOString() } } }
					}
				]
			});
			if (result.ok !== 1 || (Array.isArray(result.writeErrors) && result.writeErrors.length) || result.writeConcernError)
				throw new Error('Could not defer failed temporary lock restoration.');
		},
		error
	});
}
