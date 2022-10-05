import type { RadonClient } from '#lib/RadonClient';
import {
	countlines,
	format,
	formatDuration,
	generateModLogDescription,
	getCache,
	hours,
	isAdmin,
	isGuildOwner,
	isModerator,
	isOwner,
	managable,
	mins,
	pickRandom,
	runAllChecks,
	sec,
	summableArray,
	time,
	uid,
	wait
} from '#lib/utility';
import { Button } from './Button.js';
import { Embed } from './Embed.js';
import { Row } from './Row.js';
import { Select } from './Select.js';
export class Utils {
	public formatDuration = formatDuration;
	public generateModLogDescription = generateModLogDescription;
	public isAdmin = isAdmin;
	public isGuildOwner = isGuildOwner;
	public isModerator = isModerator;
	public isOwner = isOwner;
	public managable = managable;
	public pickRandom = pickRandom;
	public runAllChecks = runAllChecks;
	public time = time;
	public uid = uid;
	public hours = hours;
	public mins = mins;
	public sec = sec;
	public countlines = countlines;
	public format = format;
	public summableArray = summableArray;
	public wait = wait;

	public constructor(private readonly client: RadonClient) {}

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
