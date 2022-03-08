import { Blacklist } from './Blacklist';

export class GuildSettings {
    blacklists: Blacklist;
    constructor() {
        this.blacklists = new Blacklist();
    }
}
