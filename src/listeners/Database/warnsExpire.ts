import { warnsDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, container } from '@sapphire/framework';
@ApplyOptions<Listener.Options>({
    event: Events.ClientReady,
    once: false,
})
export class UserListener extends Listener {
    public override async run() {
        const expire = async () => {
            const now = new Date();
            const data = await warnsDB.find();

            data.forEach(async (warnData) => {
                if (warnData.warnlist.length) {
                    warnData.warnlist.forEach((warnlist) => {
                        warnlist.warns.forEach(async (warn) => {
                            if (now > warn.expiration) {
                                const guild = await container.client.guilds
                                    .fetch(warnData._id)
                                    .catch(() => null);
                                if (guild) {
                                    const member = await guild.members
                                        .fetch(warnlist._id)
                                        .catch(() => null);
                                    if (member) {
                                        await guild.settings?.warns.remove({
                                            member,
                                            warnid: warn._id,
                                        });
                                    }
                                }
                            }
                        });
                    });
                }
            });
            setTimeout(expire, 5000);
        };
        expire();
    }
}
