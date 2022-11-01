import { ApplyOptions } from '@sapphire/decorators';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';

@ApplyOptions<ScheduledTask.Options>({
	pattern: '* * * * *',
	bullJobsOptions: { removeOnComplete: true }
})
export class ExpireWarnTask extends ScheduledTask {
	public override async run() {
		const { guildWarns } = this.container.prisma;
		const now = new Date();
		const data = await guildWarns.findMany({
			where: {
				warnlist: { some: { warns: { some: { expiration: { lte: now } } } } }
			},
			select: { id: true, warnlist: true }
		});

		if (!data.length) return;

		for (const { id, warnlist } of data) {
			const guild = this.container.client.guilds.cache.get(id);
			if (!guild) continue;

			const warns = warnlist.map((warn) => warn.warns.filter((w) => w.expiration < now)).flat();

			const membersPromise = warns.map(async (w) => {
				const { id } = warnlist.find((mw) => mw.warns.find((warn) => warn.id === w.id))!;
				return guild.members.fetch(id).catch(() => null);
			});

			for (let i = 0; i < warns.length; i++) {
				const warn = warns[i];
				const member = await membersPromise[i];
				if (!member || !warn) return;

				await guild.settings?.warns.remove(warn.id, member);
			}
		}
	}
}
