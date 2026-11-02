import { safe } from '../../lib/presentation/components.js';
import { Severity } from '#constants';
import { ModerationCases } from '../../lib/moderation/cases.js';
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

	public override async run(data: BaseModActionData) {
		let record: Awaited<ReturnType<ModerationCases['record']>> | undefined;
		try {
			record = await new ModerationCases(this.container.prisma).record(data);
		} catch (error) {
			this.container.logger.error('Moderation action succeeded but case persistence failed', error);
		}
		const sent = await this.sendModLog(data, record?.id);
		if (record && sent) {
			try {
				await this.container.prisma.moderationCase.update({ where: { id: record.id }, data: { logMessageId: sent.id } });
			} catch (error) {
				this.container.logger.error('Moderation log sent but case association failed', error);
			}
		}
		return sent;
	}

	private sendModLog(data: ModActionData, caseId?: string) {
		const embed = new Embed()
			._color(Severity[data.action])
			._author({
				name: data.moderator.displayName,
				iconURL: data.moderator.displayAvatarURL({ forceStatic: false })
			})
			._thumbnail(data.target.displayAvatarURL({ forceStatic: false }))
			._title(this.getActionName(data.action))
			._description(data.reason?.length ? data.reason : '```\nNo reason provided\n```')
			._fields([
				{
					name: 'Moderator',
					value: `**${safe(data.moderator.displayName, 100)}** · ${data.moderator}`,
					inline: true
				},
				{
					name: 'Target',
					value: `**${safe(data.target.displayName, 100)}** · ${data.target}`,
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

		if (caseId) embed.addFields({ name: 'Case reference', value: `\`${caseId}\`` });

		return data.moderator.guild.settings?.modlogs.sendModLog(embed, data.url);
	}

	private getActionName(action: string): string {
		return action in this.action ? this.action[action as keyof typeof this.action] : action.charAt(0).toUpperCase() + action.slice(1);
	}
}
