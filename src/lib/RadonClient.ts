import { SapphireClient, container, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { client_config } from '#config';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import type { Settings, Utils } from '#lib/structures';

export class RadonClient<Ready extends boolean = boolean> extends SapphireClient<Ready> {
	public constructor() {
		super(client_config);
	}

	public override async login(token?: string): Promise<string> {
		ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
		container.database = await mongoose.connect(process.env.MONGO!);
		container.db = new Redis(process.env.REDIS_URL!);
		return super.login(token);
	}

	public override destroy(): void {
		container.database.connection.close().catch(() => null);
		return super.destroy();
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		database: typeof mongoose;
		settings: Settings;
		utils: Utils;
		db: Redis;
	}
}
