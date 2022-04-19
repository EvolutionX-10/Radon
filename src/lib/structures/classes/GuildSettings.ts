import type { Guild } from 'discord.js';
import { Blacklist } from './Blacklist.js';
import { Modlogs } from './Modlogs.js';
import { RolesConfig } from './RolesConf.js';
import { Warn } from './Warn.js';

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
