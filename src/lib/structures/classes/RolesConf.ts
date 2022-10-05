import type { PrismaClient } from '@prisma/client';
import type { Guild } from 'discord.js';

export class RolesConfig {
	public constructor(private readonly guild: Guild, private readonly prisma: PrismaClient) {
		this.guild = guild;
	}

	public get admins() {
		return (async () => {
			const data = await this.prisma.guildSettings.findUnique({
				where: {
					id: this.guild.id
				}
			});
			return data?.adminRoles ?? [];
		})();
	}

	public get mods() {
		return (async () => {
			const data = await this.prisma.guildSettings.findUnique({
				where: {
					id: this.guild.id
				}
			});
			return data?.modRoles ?? [];
		})();
	}
}
