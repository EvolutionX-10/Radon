import { container } from '@sapphire/framework';
const { prisma } = container;
export class Blacklist {
	public async add(id: string, reason: string) {
		const doc = await prisma.blacklist.upsert({
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
		const exists = await prisma.blacklist.findUnique({
			where: {
				id
			}
		});
		return Boolean(exists);
	}

	public async remove(id: string) {
		const doc = await prisma.blacklist.delete({
			where: {
				id
			}
		});
		return doc.reason;
	}
}
