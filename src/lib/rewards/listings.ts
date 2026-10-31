import type { Client } from 'discord.js';
import { LISTED_BOT_ID } from './service.js';

export async function postListingStats(botId: string, guildCount: number, tokens: { topgg?: string; dbl?: string }, fetcher: typeof fetch = fetch) {
	if (!Number.isSafeInteger(guildCount) || guildCount < 0) throw new Error('Invalid guild count');
	const targets = [
		{ name: 'Top.gg', token: tokens.topgg, url: `https://top.gg/api/bots/${botId}/stats`, body: { server_count: guildCount } },
		{ name: 'Discord Bot List', token: tokens.dbl, url: `https://discordbotlist.com/api/v1/bots/${botId}/stats`, body: { guilds: guildCount } }
	];
	return Promise.all(
		targets.map(async (target) => {
			if (!target.token) return { provider: target.name, status: 'unconfigured' as const };
			try {
				const response = await fetcher(target.url, {
					method: 'POST',
					headers: { Authorization: target.token, 'Content-Type': 'application/json' },
					body: JSON.stringify(target.body),
					signal: AbortSignal.timeout(5_000)
				});
				return { provider: target.name, status: response.ok ? ('posted' as const) : ('failed' as const), httpStatus: response.status };
			} catch {
				return { provider: target.name, status: 'failed' as const };
			}
		})
	);
}

const workers = new WeakMap<Client, () => void>();
export function startListingReporter(client: Client) {
	if (workers.has(client) || process.env.NODE_ENV !== 'production' || client.user?.id !== LISTED_BOT_ID) return;
	if (client.shard && !client.shard.ids.includes(0)) return;
	let running = false;
	let stopped = false;
	let debounce: ReturnType<typeof setTimeout> | undefined;
	const post = async () => {
		if (running || stopped || !client.isReady()) return;
		running = true;
		try {
			const ready = client.shard ? await client.shard.broadcastEval((shard) => shard.isReady()) : [true];
			if (!ready.every(Boolean)) return;
			const counts = client.shard ? await client.shard.fetchClientValues('guilds.cache.size') : [client.guilds.cache.size];
			if (!counts.every((count) => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0)) return;
			const results = await postListingStats(
				LISTED_BOT_ID,
				(counts as number[]).reduce((sum, count) => sum + count, 0),
				{
					topgg: process.env.TOP_BOT_TOKEN,
					dbl: process.env.DBL_BOT_TOKEN
				}
			);
			for (const result of results) {
				if (result.status === 'failed')
					console.warn(`Listing update failed: ${result.provider} (HTTP ${result.httpStatus ?? 'unavailable'}).`);
				else if (result.status === 'unconfigured') console.warn(`Listing update disabled: ${result.provider} token is not configured.`);
			}
		} catch {
			console.warn('Listing update could not collect complete guild counts.');
		} finally {
			running = false;
		}
	};
	const schedule = () => {
		if (!debounce)
			debounce = setTimeout(() => {
				debounce = undefined;
				void post();
			}, 60_000).unref();
	};
	client.on('guildCreate', schedule);
	client.on('guildDelete', schedule);
	const interval = setInterval(() => void post(), 30 * 60_000).unref();
	workers.set(client, () => {
		stopped = true;
		clearInterval(interval);
		if (debounce) clearTimeout(debounce);
		client.off('guildCreate', schedule);
		client.off('guildDelete', schedule);
	});
	void post();
}
export function stopListingReporter(client: Client) {
	workers.get(client)?.();
	workers.delete(client);
}
