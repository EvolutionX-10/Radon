import { SapphireClient, container, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { client_config } from '#config';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import type { Settings, Utils } from '#lib/structures';

export class RadonClient extends SapphireClient {
	public constructor() {
		super(client_config);
	}

	public override async login(token?: string): Promise<string> {
		ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
		container.database = await this.connect();
		container.db = new Redis(process.env.REDIS_URL!);
		return super.login(token);
	}

	public override async destroy(): Promise<void> {
		await container.database.connection.close();
		return super.destroy();
	}

	private async connect() {
		return mongoose.connect(process.env.MONGO!);
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
