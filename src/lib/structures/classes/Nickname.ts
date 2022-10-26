import type { PrismaClient } from '@prisma/client';
import type { Guild } from 'discord.js';

export class Nickname {
	public constructor(private readonly guild: Guild, private readonly prisma: PrismaClient) {}

	public push(id: string) {
		return this.prisma.nicknames.upsert({
			create: {
				id: this.guild.id,
				freezed: [id]
			},
			update: { freezed: { push: id } },
			where: { id: this.guild.id }
		});
	}

	public async pull(id: string) {
		const nicks = await this.get();
		if (!nicks) return;
		if (!nicks.freezed.includes(id)) return;
		return this.prisma.nicknames.update({
			data: { freezed: nicks.freezed.filter((r) => r !== id) },
			where: { id: this.guild.id }
		});
	}

	public get() {
		return this.prisma.nicknames.findUnique({
			where: { id: this.guild.id },
			select: { freezed: true }
		});
	}
}
