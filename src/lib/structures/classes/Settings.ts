import type { PrismaClient } from '@prisma/client';
import { Blacklist } from './Blacklist.js';

export class Settings {
	public blacklists: Blacklist;

	public constructor(private readonly prisma: PrismaClient) {
		this.blacklists = new Blacklist(this.prisma);
	}
}
