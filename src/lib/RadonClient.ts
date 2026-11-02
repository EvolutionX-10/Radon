import { stopTemporaryBanWorker } from './moderation/temporaryBans.js';
import { stopListingReporter } from './rewards/listings.js';
import { stopCouponAlerts } from './rewards/alerts.js';
import { ClientConfig } from '#config';
import type { Settings, Utils } from '#lib/structures';
import { PrismaClient } from '@prisma/client';
import { container, SapphireClient } from '@sapphire/framework';
import { performanceMetrics } from './utility/functions/metrics.js';
import { allowBotInteraction } from './bugs/access.js';
import type { ClientEvents, Interaction } from 'discord.js';

export class RadonClient<Ready extends boolean = boolean> extends SapphireClient<Ready> {
	public constructor() {
		super(ClientConfig);
		// Bun installs an own emit function, so a prototype override would be bypassed.
		const emit = this.emit.bind(this);
		this.emit = ((event: string | symbol, ...args: unknown[]) => {
			if (event !== 'interactionCreate') return emit(event as keyof ClientEvents, ...(args as ClientEvents[keyof ClientEvents]));
			// Guard raw events before Sapphire handlers and already-open Discord collectors.
			void allowBotInteraction(container.prisma, args[0] as Interaction)
				.then((allowed) => {
					if (allowed) emit('interactionCreate', args[0] as Interaction);
				})
				.catch(() => this.logger.error('Could not dispatch a bot interaction.'));
			return this.listenerCount(event) > 0;
		}) as typeof this.emit;
	}

	public override async login(token?: string): Promise<string> {
		if (performanceMetrics.enabled) {
			const prisma = new PrismaClient({
				log: [
					{ emit: 'event', level: 'query' },
					{ emit: 'event', level: 'error' }
				]
			});
			prisma.$on('query', (event) => performanceMetrics.record('database:query', event.duration));
			prisma.$on('error', () => performanceMetrics.record('database:error', undefined, false));
			container.prisma = prisma;
		} else {
			container.prisma = new PrismaClient();
		}
		return super.login(token);
	}

	public override destroy(): Promise<void> {
		stopTemporaryBanWorker(this);
		stopListingReporter(this);
		stopCouponAlerts(this);
		return super.destroy();
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		settings: Settings;
		utils: Utils;
		prisma: PrismaClient;
	}
}
