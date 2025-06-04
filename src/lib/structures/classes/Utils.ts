import type { RadonClient } from '#lib/RadonClient';
import * as utils from '#lib/utility';

export class Utils {
	public formatDuration = utils.formatDuration;
	public isAdmin = utils.isAdmin;
	public isGuildOwner = utils.isGuildOwner;
	public isModerator = utils.isModerator;
	public isOwner = utils.isOwner;
	public managable = utils.managable;
	public pickRandom = utils.pickRandom;
	public runAllChecks = utils.runAllChecks;
	public time = utils.time;
	public uid = utils.uid;
	public hours = utils.hours;
	public mins = utils.mins;
	public sec = utils.sec;
	public countlines = utils.countlines;
	public format = utils.format;
	public summableArray = utils.summableArray;
	public wait = utils.wait;

	public constructor(private readonly client: RadonClient) {}

	public get cache() {
		return utils.getCache(this.client);
	}
}
