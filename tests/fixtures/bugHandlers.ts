import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { container, SapphireClient } from '@sapphire/framework';
import { bugWarning } from '../../src/lib/bugs/presentation.js';
import { displayText } from './presentation.js';

// Exercise filesystem loading: button and modal pieces share one name-keyed store.
const client = new SapphireClient({
	intents: [],
	baseUserDirectory: null,
	loadDefaultErrorListeners: false,
	loadApplicationCommandRegistriesStatusListeners: false
});
const userId = '123456789012345678';
let saved = 0;
let notified = 0;
const tx = {
	bugReporter: {
		findUnique: async () => null,
		upsert: async () => ({ banned: false, nextReportAt: new Date(0) }),
		update: async () => null
	},
	bugReport: {
		findUnique: async () => null,
		create: async ({ data }: any) => {
			saved++;
			return { ...data, status: 'open' };
		}
	}
};
container.prisma = { ...tx, $transaction: (callback: any) => callback(tx) } as any;
const errors: unknown[] = [];
client.on('interactionHandlerError', (error) => errors.push(error));
try {
	const store = client.stores.get('interaction-handlers');
	await store.registerPath(fileURLToPath(new URL('../../src/interaction-handlers', import.meta.url))).loadAll();
	const warning = JSON.parse(JSON.stringify(bugWarning(userId)));
	const buttonId = warning.components[0].components.find((component: any) => component.type === 1).components[0].custom_id;
	let modal: any;
	assert.equal(
		await store.run({
			customId: buttonId,
			user: { id: userId },
			inGuild: () => true,
			isButton: () => true,
			isAnySelectMenu: () => false,
			isModalSubmit: () => false,
			showModal: async (builder: any) => {
				modal = builder.toJSON();
			}
		} as any),
		true,
		'The /bug warning button must reach its registered handler'
	);
	assert.deepEqual(errors, []);
	assert.equal(modal.custom_id, `bug:submit:${userId}`);
	assert.equal(modal.components.length, 2);
	let confirmation: any;
	assert.equal(
		await store.run({
			id: '123456789012345679',
			customId: modal.custom_id,
			user: { id: userId },
			guildId: 'guild',
			channelId: 'channel',
			isButton: () => false,
			isAnySelectMenu: () => false,
			isModalSubmit: () => true,
			deferReply: async () => null,
			editReply: async (payload: any) => {
				confirmation = payload;
			},
			fields: {
				getTextInputValue: (field: string) =>
					field === 'summary' ? 'A broken command' : 'Reproduction steps, expected result, and actual result.'
			},
			client: {
				users: {
					fetch: async () => ({
						send: async () => {
							notified++;
						}
					})
				}
			}
		} as any),
		true,
		'The modal must also reach its registered handler'
	);
	assert.deepEqual(errors, []);
	assert.equal(saved, 1);
	assert.equal(notified, 1);
	assert.match(displayText(confirmation), /was saved/);
} finally {
	await client.destroy();
}
