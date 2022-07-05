import type { Timestamp } from '#lib/structures';
import type { GuildMember, User } from 'discord.js';

export interface BaseModActionData {
	moderator: GuildMember;
	target: GuildMember | User;
	reason: string | undefined;
	action: modAction;
}

type modAction = 'warn' | 'kick' | 'ban' | 'softban' | 'unban' | 'timeout' | 'warn-remove';

interface BaseWarnActionData extends BaseModActionData {
	warnId: string;
}

type warnSeverityNum = 1 | 2 | 3 | 4 | 5;

type warnAction = 'add' | 'remove';

export type WarnActionData<T extends warnAction = 'add'> = T extends 'add'
	? BaseWarnActionData & {
			severity: warnSeverityNum;
			duration: Timestamp;
	  }
	: BaseWarnActionData;

export interface TimeoutActionData extends BaseModActionData {
	duration: Timestamp;
}
