import { Blacklist } from './Blacklist.js';

export class Settings {
	constructor() {
		this.blacklists = new Blacklist();
	}
	blacklists: Blacklist;
}
