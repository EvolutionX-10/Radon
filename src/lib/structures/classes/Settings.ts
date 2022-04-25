import { Blacklist } from './Blacklist.js';

export class Settings {
	public blacklists: Blacklist;

	public constructor() {
		this.blacklists = new Blacklist();
	}
}
