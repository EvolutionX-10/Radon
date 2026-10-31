import { stopTemporaryBanWorker } from './moderation/temporaryBans.js';
import { ClientConfig } from '#config';
import type { Settings, Utils } from '#lib/structures';
import { PrismaClient } from '@prisma/client';
import { container, SapphireClient } from '@sapphire/framework';
import { performanceMetrics } from './utility/functions/metrics.js';

export class RadonClient<Ready extends boolean = boolean> extends SapphireClient<Ready> {
	public constructor() {
		super(ClientConfig);
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
