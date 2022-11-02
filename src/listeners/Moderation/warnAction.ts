import { ModerationAction, Timestamp } from '#lib/structures';
import { RadonEvents, warnAction } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.WarnAction
})
export class UserListener extends Listener {
	public override async run(member: GuildMember, severity: number, actions: WarnAction[]) {
		const action = actions.sort((a, b) => b.severity - a.severity).find((e) => e.severity <= severity);

		if (!action) return;

		const data = {
			action: action.action,
			moderator: member.guild.me!,
			target: member,
			reason: `Automated Action (Crossed ${action.severity} severity)`,
			duration: action.action === 'timeout' ? new Timestamp(Date.now() + (action as TimeoutWarnAction).expiration) : undefined
		};

		await new ModerationAction(member.guild).invoke(data).catch(console.error);

		if (await member.guild.settings?.modlogs.modLogs_exist()) {
			this.container.client.emit(RadonEvents.ModAction, data);
		}
	}
}

interface BaseWarnAction {
	action: warnAction;
	severity: number;
}
interface TimeoutWarnAction extends BaseWarnAction {
	action: 'timeout';
	expiration: number;
}

type WarnAction<T extends warnAction = warnAction> = T extends 'timeout' ? TimeoutWarnAction : BaseWarnAction;
