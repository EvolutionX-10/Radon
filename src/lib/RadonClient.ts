import { SapphireClient, container, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { client_config } from '#config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import type { Settings, Utils } from '#lib/structures';

export class RadonClient<Ready extends boolean = boolean> extends SapphireClient<Ready> {
	public constructor() {
		super(client_config);
	}

	public override async login(token?: string): Promise<string> {
		ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.VerboseOverwrite);
		container.prisma = new PrismaClient();
		await container.prisma.$connect();
		container.db = new Redis(process.env.REDIS_URL!);
		return super.login(token);
	}

	public override destroy(): void {
		return super.destroy();
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		settings: Settings;
		utils: Utils;
		db: Redis;
		prisma: PrismaClient;
	}
}
