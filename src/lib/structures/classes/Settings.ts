import { Blacklist } from './Blacklist';

export class Settings {
	constructor() {
		this.blacklists = new Blacklist();
	}
	blacklists: Blacklist;
}
