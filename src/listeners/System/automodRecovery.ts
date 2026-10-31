import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { autoModService, raidRecoveryWhere } from '../../lib/automod/service.js';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady, once: true })
export class UserListener extends Listener {
	public override run() {
		let running = false;
		const recover = async () => {
			if (running || !this.container.client.isReady()) return;
			running = true;
			try {
				autoModService.sweep();
				const guildIds = [...this.container.client.guilds.cache.keys()];
				const configs = await this.container.prisma.automodConfig.findMany({
					where: raidRecoveryWhere(guildIds, new Date()),
					orderBy: [{ raidRestoreAt: 'asc' }, { id: 'asc' }],
					take: 100
				});
				for (const config of configs) {
					const guild = this.container.client.guilds.cache.get(config.id);
					if (!guild) continue;
					try {
						await autoModService.restoreRaid(this.container.prisma, guild, config.raidMode !== 'enforce');
					} catch (error) {
						this.container.logger.error(`AutoMod raid recovery failed for ${guild.id}`, error);
					}
				}
			} catch (error) {
				this.container.logger.error('AutoMod recovery failed', error);
			} finally {
				running = false;
			}
		};
		void recover();
		setInterval(() => void recover(), 15_000).unref();
	}
}
