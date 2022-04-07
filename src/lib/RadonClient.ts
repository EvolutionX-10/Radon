import { SapphireClient, container, ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { client_config } from '#config';
import mongoose from 'mongoose';
import { config as dotenv } from 'dotenv-cra';
import { envParseBoolean } from '#lib/env';
import type { Settings } from '#lib/structures';

dotenv({
	debug: process.env.DOTENV_DEBUG_ENABLED ? envParseBoolean('DOTENV_DEBUG_ENABLED') : undefined
});
export class RadonClient extends SapphireClient {
	public constructor() {
		super(client_config);
	}
	public override async login(token?: string): Promise<string> {
		ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
		container.database = await this.connect();
		return super.login(token);
	}
	public override async destroy(): Promise<void> {
		await container.database.connection.close();
		return super.destroy();
	}
	private async connect() {
		await mongoose.connect(process.env.MONGO as string);
		return mongoose;
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		database: typeof mongoose;
		settings: Settings;
	}
}
