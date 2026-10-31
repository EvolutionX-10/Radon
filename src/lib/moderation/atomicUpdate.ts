import type { Prisma, PrismaClient } from '@prisma/client';

/** Prisma's Mongo updateMany may split selection from writes. Keep predicates in one native operation. */
export async function atomicUpdate(
	prisma: PrismaClient,
	collection: string,
	query: Prisma.InputJsonObject,
	update: Prisma.InputJsonObject
): Promise<boolean> {
	const result = await prisma.$runCommandRaw({ findAndModify: collection, query, update, new: true });
	if (result.ok !== 1 || result.writeConcernError || (Array.isArray(result.writeErrors) && result.writeErrors.length))
		throw new Error('MongoDB did not confirm the conditional update. Check its current state before retrying.');
	return result.value !== null && result.value !== undefined;
}

export const mongoDate = (date: Date) => ({ $date: date.toISOString() });
