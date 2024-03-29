import type { PrismaClient } from '@prisma/client';
import { Blacklist } from './Blacklist.js';
import { Modlogs } from './Modlogs.js';
import { Nickname } from './Nickname.js';
import { RolesConfig } from './RolesConf.js';
import { Warn } from './Warn.js';
import type { Guild } from 'discord.js';

export class GuildSettings {
	public blacklists: Blacklist;
	public modlogs: Modlogs;
	public roles: RolesConfig;
	public warns: Warn;
	public nicknames: Nickname;
	public constructor(
		private readonly guild: Guild,
		private readonly prisma: PrismaClient
	) {
		this.blacklists = new Blacklist(this.prisma);
		this.modlogs = new Modlogs(this.guild, this.prisma);
		this.roles = new RolesConfig(this.guild, this.prisma);
		this.warns = new Warn(this.guild, this.prisma);
		this.nicknames = new Nickname(this.guild, this.prisma);
	}
}
