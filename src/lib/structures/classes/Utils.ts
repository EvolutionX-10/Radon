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
	sec
} from '#lib/utility';
import { Button } from './Button';
import { Embed } from './Embed';
import { Row } from './Row';
import { Select } from './Select';
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
	public constructor() {
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
	}
}
