import assert from 'node:assert/strict';
import { SapphireClient } from '@sapphire/framework';
import { SlashCommandBuilder } from 'discord.js';
import { UserCommand as Setup } from '../../src/commands/Admin/setup.js';
import { UserCommand as Doctor } from '../../src/commands/Admin/doctor.js';

// Constructor/decorator inheritance uses Sapphire's global stores: isolate this fixture.
const client = new SapphireClient({
	intents: [],
	baseUserDirectory: null,
	loadDefaultErrorListeners: false,
	loadApplicationCommandRegistriesStatusListeners: false
});
try {
	const store = client.stores.get('commands');
	for (const [Constructor, name] of [
		[Setup, 'setup'],
		[Doctor, 'doctor']
	] as const) {
		const command = new Constructor({ name, path: `/virtual/Admin/${name}.ts`, root: '/virtual', store }, {});
		assert.equal(command.name, name);
		assert.equal(command.permissionLevel, 6);
		assert.equal(command.supportsChatInputCommands(), true);
		assert.equal(
			command.preconditions.entries.some((entry: any) => entry.name === 'ClientPermissions'),
			false
		);
		let data: any;
		command.registerApplicationCommands({
			registerChatInputCommand: (build: any) => {
				data = build(new SlashCommandBuilder()).toJSON();
			}
		} as any);
		assert.equal(data.name, name);
		assert.equal(data.default_member_permissions, '8');
		if (name === 'setup')
			assert.deepEqual(
				data.options.map((o: any) => o.name),
				['start', 'view']
			);
	}
} finally {
	await client.destroy();
}
