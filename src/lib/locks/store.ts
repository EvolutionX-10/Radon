import type { Prisma, PrismaClient } from '@prisma/client';
import type { LockStore } from './LockService.js';

function checked(result: Prisma.JsonObject): Prisma.JsonObject {
	if (result.ok !== 1 || (Array.isArray(result.writeErrors) && result.writeErrors.length > 0) || result.writeConcernError)
		throw new Error('Lock snapshot persistence failed; permission recovery data was retained.');
	return result;
}

/** Prisma's Mongo updateMany can lose its original predicate during ID resolution.
 * Raw findAndModify keeps lease acquisition conditional in a single server command.
 */
export function lockStore(prisma: PrismaClient): LockStore {
	return {
		find: (id) => prisma.channelLockSnapshot.findUnique({ where: { id } }),
		create: async (data) => {
			await prisma.channelLockSnapshot.create({ data });
		},
		claim: async (id, previousToken, operationToken, now, leaseUntil) => {
			const result = await prisma.$runCommandRaw({
				findAndModify: 'channelLockSnapshot',
				query: { _id: id, operationToken: previousToken, $or: [{ leaseUntil: null }, { leaseUntil: { $lt: { $date: now.toISOString() } } }] },
				update: { $set: { operationToken, leaseUntil: { $date: leaseUntil.toISOString() } } },
				new: true
			});
			return !!checked(result).value;
		},
		release: async (id, operationToken) => {
			checked(
				await prisma.$runCommandRaw({
					update: 'channelLockSnapshot',
					updates: [{ q: { _id: id, operationToken }, u: { $set: { leaseUntil: null } } }]
				})
			);
		},
		remove: async (id, operationToken) => {
			const result = checked(
				await prisma.$runCommandRaw({ delete: 'channelLockSnapshot', deletes: [{ q: { _id: id, operationToken }, limit: 1 }] })
			);
			if (result.n !== 1) throw new Error('Lock ownership changed during restoration; recovery data was retained.');
		}
	};
}
