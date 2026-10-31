import type { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID, RedemptionError, receiptKey, type ReceiptStore, type Reservation } from './service.js';

export class PrismaReceipts implements ReceiptStore {
	public constructor(private readonly prisma: PrismaClient) {}
	public async reserve(id: string, lifetimeMs: number): Promise<Reservation> {
		const now = new Date();
		const token = randomUUID();
		const expiresAt = new Date(now.getTime() + lifetimeMs);
		const current = await this.prisma.redemptionReceipt.findUnique({ where: { id } });
		if (current?.status === 'success') return { kind: 'succeeded' };
		if (current && current.expiresAt > now) return { kind: 'busy' };
		if (current) {
			const updated = await mongoWrite(this.prisma, {
				findAndModify: 'redemptionReceipt',
				query: { _id: id, token: current.token, expiresAt: { $lte: { $date: now.toISOString() } }, status: { $ne: 'success' } },
				update: { $set: { token, status: 'pending', expiresAt: { $date: expiresAt.toISOString() }, updatedAt: { $date: now.toISOString() } } }
			});
			return updated.value ? { kind: 'acquired', token } : { kind: 'busy' };
		}
		try {
			await this.prisma.redemptionReceipt.create({ data: { id, token, status: 'pending', expiresAt, updatedAt: now } });
			return { kind: 'acquired', token };
		} catch (error) {
			if (isDuplicate(error)) return { kind: 'busy' };
			throw error;
		}
	}
	public async block(id: string, lifetimeMs: number) {
		for (let attempt = 0; attempt < 8; attempt++) {
			try {
				await mongoWrite(this.prisma, {
					findAndModify: 'redemptionReceipt',
					query: { _id: id },
					upsert: true,
					update: {
						$max: { expiresAt: { $date: new Date(Date.now() + lifetimeMs).toISOString() } },
						$set: { token: randomUUID(), status: 'pending', updatedAt: { $date: new Date().toISOString() } }
					}
				});
				return;
			} catch (error) {
				if (!isDuplicate(error)) throw error;
			}
		}
		throw new RedemptionError('The publisher cooldown could not be saved.');
	}
	public async finish(id: string, token: string, status: 'success' | 'unknown' | 'release') {
		if (status === 'release') {
			await mongoWrite(this.prisma, { delete: 'redemptionReceipt', deletes: [{ q: { _id: id, token }, limit: 1 }] });
		} else {
			await mongoWrite(this.prisma, {
				update: 'redemptionReceipt',
				updates: [{ q: { _id: id, token }, u: { $set: { status, updatedAt: { $date: new Date().toISOString() } } }, multi: false }]
			});
		}
	}
}

function isDuplicate(error: unknown) {
	return (
		!!error &&
		typeof error === 'object' &&
		'code' in error &&
		(error.code === 'P2002' ||
			('meta' in error && !!error.meta && typeof error.meta === 'object' && 'code' in error.meta && String(error.meta.code) === '11000'))
	);
}
async function mongoWrite(prisma: PrismaClient, command: Prisma.InputJsonObject) {
	// Prisma Mongo updateMany can preselect IDs; only native commands preserve the
	// compare-and-swap predicate through the actual write.
	const result = await prisma.$runCommandRaw(command);
	if (result.ok !== 1 || (Array.isArray(result.writeErrors) && result.writeErrors.length > 0) || result.writeConcernError)
		throw new RedemptionError('The database could not confirm this operation.');
	return result;
}
export async function saveMemberCode(prisma: PrismaClient, userId: string, memberCode: string, name?: string) {
	for (let attempt = 0; attempt < 8; attempt++) {
		const current = await prisma.memberCodes.findUnique({ where: { id: userId } });
		if (current?.memberCodes.includes(memberCode)) {
			if (name)
				await prisma.redemptionAccountLabel.upsert({
					where: { id: receiptKey('label', userId, memberCode) },
					create: { id: receiptKey('label', userId, memberCode), name },
					update: { name }
				});
			return current.memberCodes.length;
		}
		if (current && current.memberCodes.length >= 5) throw new RedemptionError('You have reached the limit of five accounts. Delete one first.');
		if (!current) {
			try {
				await prisma.memberCodes.create({ data: { id: userId, memberCodes: [memberCode], createdAt: new Date(), updatedAt: new Date() } });
			} catch (error) {
				if (isDuplicate(error)) continue;
				throw error;
			}
		} else {
			const updated = await mongoWrite(prisma, {
				findAndModify: 'memberCodes',
				query: { _id: userId, memberCodes: current.memberCodes },
				update: { $push: { memberCodes: memberCode }, $set: { updatedAt: { $date: new Date().toISOString() } } }
			});
			if (!updated.value) continue;
		}
		if (name)
			await prisma.redemptionAccountLabel.upsert({
				where: { id: receiptKey('label', userId, memberCode) },
				create: { id: receiptKey('label', userId, memberCode), name },
				update: { name }
			});
		return (current?.memberCodes.length ?? 0) + 1;
	}
	throw new RedemptionError('Your accounts changed while saving. Please try again.');
}
export async function deleteMemberCode(prisma: PrismaClient, userId: string, memberCode: string) {
	for (let attempt = 0; attempt < 8; attempt++) {
		const current = await prisma.memberCodes.findUnique({ where: { id: userId } });
		if (!current?.memberCodes.includes(memberCode)) throw new RedemptionError('This member code is not registered to your account.');
		const updated = await mongoWrite(prisma, {
			findAndModify: 'memberCodes',
			query: { _id: userId, memberCodes: current.memberCodes },
			update: {
				$set: { memberCodes: current.memberCodes.filter((code) => code !== memberCode), updatedAt: { $date: new Date().toISOString() } }
			}
		});
		if (!updated.value) continue;
		await prisma.redemptionAccountLabel.deleteMany({ where: { id: receiptKey('label', userId, memberCode) } });
		return current.memberCodes.length - 1;
	}
	throw new RedemptionError('Your accounts changed while deleting. Please try again.');
}
