import { BaseModActionData, ModActionData, RadonEvents, WarnActionData } from '#lib/types';
import { generateModLogDescription, severity } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ModAction
})
export class UserListener extends Listener {
	public override run(data: BaseModActionData) {
		return this.sendModLog(data);
	}

	private sendModLog(data: ModActionData) {
		const embed = this.container.utils
			.embed()
			._color(severity[data.action])
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			action: action[data.action],
			member: data.target,
			reason: data.reason,
			duration: data.duration,
			warnId: (data as WarnActionData).warnId
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}
}

const action = {
	warn: 'Warn',
	warn_remove: 'Warn Removal',
	kick: 'Kick',
	ban: 'Ban',
	softban: 'Softban',
	timeout: 'Timeout',
	unban: 'Unban'
};
