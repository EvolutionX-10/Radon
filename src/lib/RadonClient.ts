import 'dotenv/config';
import { SapphireClient, container } from '@sapphire/framework';
import { client_config } from '#config';
import mongoose from 'mongoose';

export class RadonClient extends SapphireClient {
    public constructor() {
        super(client_config);
    }
    public override async login(token?: string): Promise<string> {
        container.logger.info('Logging in...');
        container.database = await this.connect();
        return await super.login(token);
    }
    public override async destroy(): Promise<void> {
        await container.database.connection.close();
        return super.destroy();
    }
    private async connect() {
        await mongoose.connect(process.env.MONGO as string);
        container.logger.info(`Connected to Database!`);
        return mongoose;
    }
}

declare module '@sapphire/pieces' {
    interface Container {
        database: typeof mongoose;
    }
}
