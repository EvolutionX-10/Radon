import { BaseModActionData, RadonEvents, TimeoutActionData, WarnActionData } from '#lib/types';
import { generateModLogDescription, severity } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ModAction
})
export class UserListener extends Listener {
	public override run(data: BaseModActionData) {
		switch (data.action) {
			case 'warn':
				return this.warn<'add'>(data as WarnActionData<'add'>);
			case 'warn-remove':
				return this.warn<'remove'>(data as WarnActionData<'remove'>);
			case 'kick':
				return this.kick(data);
			case 'ban':
				return this.ban(data);
			case 'softban':
				return this.softban(data);
			case 'timeout':
				return this.timeout(data as TimeoutActionData);
			case 'unban':
				return this.unban(data);
		}
	}

	private warn<T extends warnAction>(data: WarnActionData<T>) {
		const embed = this.container.utils
			.embed()
			._color(data.action === 'warn' ? severity.warn : severity.warn_removal)
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			member: data.target,
			action: data.action === 'warn' ? 'Warn' : 'Warn Removal',
			reason: data.reason,
			duration: data.action === 'warn' ? (data as WarnActionData).duration : undefined,
			warnId: data.warnId
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}

	private kick(data: BaseModActionData) {
		const embed = this.container.utils
			.embed()
			._color(severity.kick)
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			member: data.target,
			action: 'Kick',
			reason: data.reason
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}

	private ban(data: BaseModActionData) {
		const embed = this.container.utils
			.embed()
			._color(severity.ban)
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			member: data.target,
			action: 'Ban',
			reason: data.reason
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}

	private softban(data: BaseModActionData) {
		const embed = this.container.utils
			.embed()
			._color(severity.softban)
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			member: data.target,
			action: 'Softban',
			reason: data.reason
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}

	private timeout(data: TimeoutActionData) {
		const embed = this.container.utils
			.embed()
			._color(severity.timeout)
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			member: data.target,
			action: 'Timeout',
			reason: data.reason,
			duration: data.duration
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}

	private unban(data: BaseModActionData) {
		const embed = this.container.utils
			.embed()
			._color(severity.unban)
			._author({
				name: data.moderator.user.tag,
				iconURL: data.moderator.user.displayAvatarURL({
					dynamic: true
				})
			});
		const des = generateModLogDescription({
			member: data.target,
			action: 'Unban',
			reason: data.reason
		});

		embed._description(des);

		return data.moderator.guild.settings?.modlogs.sendModLog(embed);
	}
}

type warnAction = 'add' | 'remove';
