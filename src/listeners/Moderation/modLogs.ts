import { Severity } from '#constants';
import { Embed } from '#lib/structures';
import { type BaseModActionData, type ModActionData, RadonEvents, type WarnActionData } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ModAction
})
export class UserListener extends Listener {
	private readonly action = {
		warn: 'Warn',
		warn_remove: 'Warn Remove',
		kick: 'Kick',
		ban: 'Ban',
		softban: 'Softban',
		timeout: 'Timeout',
		unban: 'Unban'
	};

	public override run(data: BaseModActionData) {
		return this.sendModLog(data);
	}

	private sendModLog(data: ModActionData) {
		const embed = new Embed()
			._color(Severity[data.action])
			._author({
				name: data.moderator.displayName,
				iconURL: data.moderator.displayAvatarURL({ forceStatic: false })
			})
			._thumbnail(data.target.displayAvatarURL({ forceStatic: false }))
			._title(`${this.getActionName(data.action)}`)
			._description(`\`\`\`\n${data.reason || 'No reason provided'}\n\`\`\``)
			._fields([
				{
					name: 'Moderator',
					value: `- ${data.moderator} \`[${data.moderator.id}]\``,
					inline: true
				},
				{
					name: 'Target',
					value: `- ${data.target} \`[${data.target.id}]\``,
					inline: true
				}
			])
			._timestamp();

		if (data.duration) {
			embed.addFields({
				name: 'Duration',
				value: `- ${data.duration.getShortDateTime()} [${data.duration.getRelativeTime()}]`
			});
		}

		if ((data as WarnActionData)?.warnId) {
			embed.addFields({
				name: 'Warn ID',
				value: `- \`${(data as WarnActionData).warnId}\``
			});
		}
		if ((data as WarnActionData)?.severity) {
			embed.addFields({
				name: 'Severity',
				value: `- ${(data as WarnActionData).severity}`
			});
		}

		return data.moderator.guild.settings?.modlogs.sendModLog(embed, data.url);
	}

	private getActionName(action: string): string {
		return action in this.action ? this.action[action as keyof typeof this.action] : action.charAt(0).toUpperCase() + action.slice(1);
	}
}
