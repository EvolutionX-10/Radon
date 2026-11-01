import assert from 'node:assert/strict';
import { container } from '@sapphire/framework';
import { InteractionCollector, MessageFlags } from 'discord.js';
import { RadonClient } from '../../src/lib/RadonClient.js';
import { Owners } from '../../src/lib/utility/constants.js';

// A real Sapphire client changes singleton stores and module initialization state.
// Run this fixture in its own process so other command fixtures stay independent.
const client = new RadonClient<true>();
const collector = new InteractionCollector(client, { time: 5000 });
let collectorActions = 0;
let handlerActions = 0;
let lookups = 0;
let state: 'banned' | 'allowed' | 'failed' = 'banned';
let otherPayload: unknown;
collector.on('collect', () => collectorActions++);
client.on('interactionCreate', () => handlerActions++);
client.on('test-event', (payload) => {
	otherPayload = payload;
});
container.prisma = {
	bugReporter: {
		findUnique: async () => {
			lookups++;
			if (state === 'failed') throw new Error('Database unavailable');
			return state === 'banned' ? { banned: true } : null;
		}
	}
} as any;
const tick = () => new Promise((resolve) => setImmediate(resolve));

try {
	for (const deniedState of ['banned', 'failed'] as const) {
		state = deniedState;
		let reply: { flags: number } | undefined;
		assert.equal(
			client.emit('interactionCreate', {
				id: '123456789012345679',
				user: { id: '123456789012345678' },
				isAutocomplete: () => false,
				isRepliable: () => true,
				reply: async (payload: { flags: number }) => {
					reply = payload;
				}
			} as any),
			true
		);
		await tick();
		assert.equal(reply?.flags! & MessageFlags.Ephemeral, MessageFlags.Ephemeral);
	}
	assert.equal(collectorActions, 0);
	assert.equal(handlerActions, 0);
	state = 'allowed';
	client.emit('interactionCreate', { id: 'allowed', user: { id: '123456789012345678' } } as any);
	await tick();
	assert.equal(collectorActions, 1);
	assert.equal(handlerActions, 1);
	client.emit('interactionCreate', { id: 'owner', user: { id: Owners[0] } } as any);
	await tick();
	assert.equal(collectorActions, 2);
	assert.equal(handlerActions, 2);
	assert.equal(lookups, 3);
	assert.equal(client.emit('test-event', 'payload'), true);
	assert.equal(otherPayload, 'payload');
	assert.equal(client.emit('missing-event'), false);
} finally {
	collector.stop();
	await client.destroy();
}
