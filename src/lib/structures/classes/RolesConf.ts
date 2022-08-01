import { container } from '@sapphire/framework';
import type { Guild } from 'discord.js';
const { prisma } = container;

export class RolesConfig {
	public constructor(private readonly guild: Guild) {
		this.guild = guild;
	}

	public get admins() {
		return (async () => {
			const data = await prisma.guildSettings.findUnique({
				where: {
					id: this.guild.id
				}
			});
			return data?.adminRoles ?? [];
		})();
	}

	public get mods() {
		return (async () => {
			const data = await prisma.guildSettings.findUnique({
				where: {
					id: this.guild.id
				}
			});
			return data?.modRoles ?? [];
		})();
	}
}
