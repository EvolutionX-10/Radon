import type { PrismaClient } from '@prisma/client';

export class Blacklist {
	public constructor(private readonly prisma: PrismaClient) {}

	public async add(id: string, reason: string) {
		const doc = await this.prisma.blacklist.upsert({
			create: {
				id,
				reason
			},
			update: {
				reason
			},
			where: {
				id
			}
		});

		if (!doc) return null;
		return doc;
	}

	public async isBlacklisted(id: string) {
		const exists = await this.prisma.blacklist.findUnique({
			where: {
				id
			}
		});
		return Boolean(exists);
	}

	public async remove(id: string) {
		const doc = await this.prisma.blacklist.delete({
			where: {
				id
			}
		});
		return doc.reason;
	}
}
