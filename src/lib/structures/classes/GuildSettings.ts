import type { Guild } from 'discord.js';
import { Blacklist } from './Blacklist';
import { Modlogs } from './Modlogs';
import { RolesConfig } from './RolesConf';
import { Warn } from './Warn';

export class GuildSettings {
	blacklists: Blacklist;
	modlogs: Modlogs;
	roles: RolesConfig;
	warns: Warn;
	constructor(private readonly guild: Guild) {
		this.blacklists = new Blacklist();
		this.modlogs = new Modlogs(this.guild);
		this.roles = new RolesConfig(this.guild);
		this.warns = new Warn(this.guild);
	}
}
