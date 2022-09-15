import { ClientConfig } from '#config';
import type { Settings, Utils } from '#lib/structures';
import { PrismaClient } from '@prisma/client';
import { container, SapphireClient } from '@sapphire/framework';

export class RadonClient<Ready extends boolean = boolean> extends SapphireClient<Ready> {
	public constructor() {
		super(ClientConfig);
	}

	public override async login(token?: string): Promise<string> {
		container.prisma = new PrismaClient();
		await container.prisma.$connect();
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
		prisma: PrismaClient;
	}
}
