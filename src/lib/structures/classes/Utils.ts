import type { RadonClient } from '#lib/RadonClient';
import {
	formatDuration,
	generateModLogDescription,
	isAdmin,
	isGuildOwner,
	isModerator,
	isOwner,
	managable,
	pickRandom,
	runAllChecks,
	time,
	uid,
	hours,
	mins,
	sec,
	countlines,
	getCache
} from '#lib/utility';
import { Button } from './Button.js';
import { Embed } from './Embed.js';
import { Row } from './Row.js';
import { Select } from './Select.js';
export class Utils {
	public formatDuration;
	public generateModLogDescription;
	public isAdmin;
	public isGuildOwner;
	public isModerator;
	public isOwner;
	public managable;
	public pickRandom;
	public runAllChecks;
	public time;
	public uid;
	public hours;
	public mins;
	public sec;
	public countlines;

	public constructor(private readonly client: RadonClient) {
		this.formatDuration = formatDuration;
		this.generateModLogDescription = generateModLogDescription;
		this.isAdmin = isAdmin;
		this.isGuildOwner = isGuildOwner;
		this.isModerator = isModerator;
		this.isOwner = isOwner;
		this.managable = managable;
		this.pickRandom = pickRandom;
		this.runAllChecks = runAllChecks;
		this.time = time;
		this.uid = uid;
		this.hours = hours;
		this.mins = mins;
		this.sec = sec;
		this.countlines = countlines;
	}

	public embed() {
		return new Embed();
	}

	public button() {
		return new Button();
	}

	public select() {
		return new Select();
	}

	public row() {
		return new Row();
	}

	public get cache() {
		return getCache(this.client);
	}
}
