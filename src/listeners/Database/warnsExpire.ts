import { RadonEvents } from '#lib/types';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady
})
export class UserListener extends Listener {
	public override async run() {
		const { guildWarns } = this.container.prisma;
		const expire = async () => {
			const now = new Date();
			const data = await guildWarns.findMany();

			for (const warnData of data) {
				if (warnData.warnlist.length) {
					for (const warnlist of warnData.warnlist) {
						for (const warn of warnlist.warns) {
							if (warn.expiration < now) {
								const guild = await this.container.client.guilds.fetch(warnData.id).catch(() => null);
								if (guild) {
									const member = await guild.members.fetch(warnlist.id).catch(() => null);
									if (member) {
										await guild.settings?.warns.remove({
											member,
											warnId: warn.id
										});
									}
								}
							}
						}
					}
				}
			}
			setTimeout(expire, sec(30));
		};
		await expire();
	}
}
