import type { PrismaClient } from '@prisma/client';
import type { Guild } from 'discord.js';

export class RolesConfig {
	public constructor(
		private readonly guild: Guild,
		private readonly prisma: PrismaClient
	) {}

	/** One fresh settings read for all role checks in an operation; never caches revocations. */
	public async snapshot() {
		const data = await this.prisma.guildSettings.findUnique({ where: { id: this.guild.id } });
		return { admins: data?.adminRoles ?? [], mods: data?.modRoles ?? [] };
	}

	public get admins() {
		return this.snapshot().then((roles) => roles.admins);
	}

	public get mods() {
		return this.snapshot().then((roles) => roles.mods);
	}
}
