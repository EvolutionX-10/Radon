import type { Guild } from 'discord.js';
import { Blacklist } from './Blacklist';
import { Modlogs } from './Modlogs';

export class GuildSettings {
    blacklists: Blacklist;
    modlogs: Modlogs;
    guild: Guild;
    constructor(guild: Guild) {
        this.guild = guild;
        this.blacklists = new Blacklist();
        this.modlogs = new Modlogs(guild);
    }
}
