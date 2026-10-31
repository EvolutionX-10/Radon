import { randomUUID } from 'node:crypto';

export type LockScope = 'text' | 'voice' | 'category' | 'thread' | 'all text' | 'all voice' | 'all thread' | 'server';
export interface LockSession {
	userId: string;
	guildId: string;
	action: 'lock' | 'unlock';
	scope: LockScope;
	roleId: string;
	channelId?: string;
	threads: boolean;
	deep: boolean;
}

export class LockSessions {
	private readonly pending = new Map<string, { session: LockSession; expires: number }>();
	public constructor(private readonly now = () => Date.now()) {}
	public create(session: LockSession): string {
		for (const [id, value] of this.pending) if (value.expires <= this.now()) this.pending.delete(id);
		if (this.pending.size >= 1000) throw new Error('Too many pending lock prompts. Please try again shortly.');
		const id = randomUUID();
		this.pending.set(id, { session: { ...session }, expires: this.now() + 300_000 });
		return id;
	}
	public consume(id: string, userId: string, guildId: string): LockSession | null {
		const value = this.pending.get(id);
		if (!value || value.expires <= this.now()) {
			this.pending.delete(id);
			return null;
		}
		if (value.session.userId !== userId || value.session.guildId !== guildId) return null;
		this.pending.delete(id);
		return value.session;
	}
}
export const lockSessions = new LockSessions();
