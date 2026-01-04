import 'dotenv/config';
import type { PrismaConfig } from 'prisma';
import { env } from 'prisma/config';

export default {
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations'
	},
	engine: 'classic',
	datasource: {
		url: env('MONGO')
	}
} satisfies PrismaConfig;
