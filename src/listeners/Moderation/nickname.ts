import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildMember, AuditLogEvent } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.GuildMemberUpdate
})
export class UserListener extends Listener {
	public async run(oldMember: GuildMember, newMember: GuildMember) {
		if (oldMember.partial) oldMember = await oldMember.fetch();
		if (newMember.partial) newMember = await newMember.fetch();

		const conditions =
			(oldMember.nickname && !newMember.nickname) || // * Member removed nickname
			(!oldMember.nickname && newMember.nickname) || // * Member added Nickname
			(oldMember.nickname && newMember.nickname && oldMember.nickname !== newMember.nickname); // * Member changed nickname

		if (!conditions) return;

		const logs = await oldMember.guild
			.fetchAuditLogs({
				type: AuditLogEvent.MemberUpdate,
				limit: 1
			})
			.catch(() => null);

		const entry = logs?.entries.first();

		if (!logs || !entry) return;

		if (entry.executor?.id !== entry.target?.id) return;

		const nicks = await oldMember.guild.settings?.nicknames.get();

		if (!nicks || !nicks.freezed.length) return;
		if (!nicks.freezed.includes(oldMember.id)) return;

		await newMember.setNickname(oldMember.displayName, 'Freezed Nickname').catch(() => null);
	}
}
