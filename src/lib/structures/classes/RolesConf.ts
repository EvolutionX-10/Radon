import { guildSettingsDB } from '#models';
import type { Guild } from 'discord.js';

export class RolesConfig {
	public constructor(private readonly guild: Guild) {
		this.guild = guild;
	}

	public get admins() {
		return (async () => {
			const data = await guildSettingsDB.findById(this.guild.id).catch(() => null);
			if (data && data.adminRoles) return data.adminRoles;
			return [];
		})();
	}

	public get mods() {
		return (async () => {
			const data = await guildSettingsDB.findById(this.guild.id).catch(() => null);
			if (data && data.modRoles) return data.modRoles;
			return [];
		})();
	}
}
