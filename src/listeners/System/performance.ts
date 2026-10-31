import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type SapphireClient } from '@sapphire/framework';
import { PerformanceMetrics, performanceMetrics, stopwatchMilliseconds } from '../../lib/utility/functions/metrics.js';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady, once: true })
export class UserListener extends Listener {
	public override run() {
		registerPerformanceListeners(this.container.client, performanceMetrics);
	}
}

export function registerPerformanceListeners(client: SapphireClient, metrics: PerformanceMetrics) {
	if (!metrics.enabled) return;
	client.on(Events.ChatInputCommandFinish, (_interaction, command, payload) => {
		metrics.record(`slash:${command.name}`, payload.duration, payload.success);
	});
	client.on(Events.ContextMenuCommandFinish, (_interaction, command, payload) => {
		metrics.record(`context:${command.name}`, payload.duration, payload.success);
	});
	client.on(Events.MessageCommandFinish, (_message, command, payload) => {
		metrics.record(`message:${command.name}`, payload.duration, payload.success);
	});
	client.on('codeClaim', (result: unknown) => {
		if (!result || typeof result !== 'object' || !('success' in result) || typeof result.success !== 'boolean') return;
		const duration =
			'elapsedMs' in result && typeof result.elapsedMs === 'number'
				? result.elapsedMs
				: 'elapsedTime' in result
					? stopwatchMilliseconds(result.elapsedTime)
					: undefined;
		const game =
			'game' in result && typeof result.game === 'string' && ['sololv', 'tskgb', 'nanarise'].includes(result.game) ? result.game : 'sololv';
		metrics.record(`redemption:${game}`, duration, result.success);
		const statuses = ['already_claimed', 'rejected', 'rate_limited', 'unknown', 'busy', 'invalid'];
		if (!result.success && 'status' in result && typeof result.status === 'string' && statuses.includes(result.status)) {
			metrics.record(`redemption-failure:${result.status}`, duration, false);
		}
	});
}
