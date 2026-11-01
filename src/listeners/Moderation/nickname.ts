import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { GuildMember, AuditLogEvent } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.GuildMemberUpdate
})
export class UserListener extends Listener {
	public async run(oldMember: GuildMember, newMember: GuildMember) {
		let fetchedOldMember,
			fetchedNewMember: GuildMember | null = null;
		if (oldMember.partial) fetchedOldMember = await oldMember.fetch().catch(() => null);
		if (newMember.partial) fetchedNewMember = await newMember.fetch().catch(() => null);

		if (!fetchedOldMember || !fetchedNewMember) return;
		const conditions =
			(fetchedOldMember.nickname && !fetchedNewMember.nickname) || // * Member removed nickname
			(!fetchedOldMember.nickname && fetchedNewMember.nickname) || // * Member added Nickname
			(fetchedOldMember.nickname && fetchedNewMember.nickname && fetchedOldMember.nickname !== fetchedNewMember.nickname); // * Member changed nickname

		if (!conditions) return;

		const logs = await fetchedOldMember.guild
			.fetchAuditLogs({
				type: AuditLogEvent.MemberUpdate,
				limit: 1
			})
			.catch(() => null);

		const entry = logs?.entries.first();

		if (!logs || !entry) return;

		if (entry.executor?.id !== entry.target?.id) return;

		const nicks = await fetchedOldMember.guild.settings?.nicknames.get();

		if (!nicks || !nicks.freezed.length) return;
		if (!nicks.freezed.includes(fetchedOldMember.id)) return;

		await fetchedNewMember.setNickname(fetchedOldMember.displayName, 'Freezed Nickname').catch(() => null);
	}
}
