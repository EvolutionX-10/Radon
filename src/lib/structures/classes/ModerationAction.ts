import { Guild, GuildMember, User } from 'discord.js';
import type { GuildInteraction, ModActionData, TimeoutActionData } from '#lib/types';
import { runAllChecks } from '#lib/utility';

export class ModerationAction {
	public constructor(public readonly guild: Guild) {}

	public invoke(data: ModActionData) {
		const { moderator, target, action } = data;
		const { content, result } = runAllChecks(moderator, target as GuildMember, action);
		if (!result) throw new Error(content);

		switch (action) {
			case 'ban':
				return this.ban(data);
			case 'kick':
				return this.kick(data);
			case 'timeout':
				return this.timeout(data as TimeoutActionData);
			case 'softban':
				return this.ban(data, true);
			default:
				throw new Error(`Unknown action: ${data.action}`);
		}
	}

	public reply(interaction: GuildInteraction, reply: string) {
		if (interaction.replied) {
			return interaction.editReply({ content: reply });
		}
		return interaction.reply(reply);
	}

	private async ban(data: ModActionData, soft = false, extra?: unknown) {
		const { target, reason } = data;
		if (target instanceof User) return;
		await target.ban({
			days: (extra || 0) as number,
			reason
		});
		if (soft) await this.guild.members.unban(target.id, reason);
		return this;
	}

	private async kick(data: ModActionData) {
		const { target, reason } = data;
		if (target instanceof User) return;
		await target.kick(reason);
		return this;
	}

	private async timeout(data: TimeoutActionData) {
		const { target, reason, duration } = data;
		if (target instanceof User) return;
		await target.disableCommunicationUntil(duration.timestamp, reason);
		return this;
	}
}
