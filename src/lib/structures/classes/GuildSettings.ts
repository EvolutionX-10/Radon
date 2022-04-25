import type { Guild } from 'discord.js';
import { Blacklist } from './Blacklist.js';
import { Modlogs } from './Modlogs.js';
import { RolesConfig } from './RolesConf.js';
import { Warn } from './Warn.js';

export class GuildSettings {
	public blacklists: Blacklist;
	public modlogs: Modlogs;
	public roles: RolesConfig;
	public warns: Warn;
	public constructor(private readonly guild: Guild) {
		this.blacklists = new Blacklist();
		this.modlogs = new Modlogs(this.guild);
		this.roles = new RolesConfig(this.guild);
		this.warns = new Warn(this.guild);
	}
}
