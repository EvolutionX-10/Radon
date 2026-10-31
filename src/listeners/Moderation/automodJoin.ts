import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GatewayIntentBits, type GuildMember } from 'discord.js';
import { autoModService } from '../../lib/automod/service.js';

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberAdd })
export class UserListener extends Listener {
	public override async run(member: GuildMember) {
		if (!this.container.client.options.intents.has(GatewayIntentBits.GuildMembers)) return;
		try {
			await autoModService.join(this.container.prisma, member);
		} catch (error) {
			this.container.logger.error('AutoMod join processing failed', error);
		}
	}
}
