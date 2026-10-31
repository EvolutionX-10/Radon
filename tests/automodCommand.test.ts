import { displayText } from './fixtures/presentation.js';
import { beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { ChannelType, Collection, IntentsBitField, SlashCommandBuilder } from 'discord.js';
import { UserCommand } from '../src/commands/Admin/automod.js';
import type { RadonCommand } from '../src/lib/structures/commands/RadonCommand.js';
import { autoModService } from '../src/lib/automod/service.js';

let command: UserCommand;
let existingConfig: Record<string, unknown> | null = null;
const writes = mock(async (_options: unknown) => undefined);
const testContainer = { logger: { error: () => undefined }, prisma: { automodConfig: { findUnique: async () => existingConfig, upsert: writes } } };
beforeAll(() => {
	// Test command routes without replacing Sapphire's process-global container;
	// other command suites intentionally exercise their own real framework client.
	command = Object.assign(Object.create(UserCommand.prototype), { name: 'automod', description: 'Configure automatic moderation' });
	Object.defineProperty(command, 'container', { value: testContainer });
});
beforeEach(() => {
	writes.mockClear();
	existingConfig = null;
});

function interaction(values: Record<string, unknown>, rules = new Collection<string, any>()) {
	const channel = { id: '123456789012345678', type: ChannelType.GuildText, permissionsFor: () => ({ has: () => true }) };
	const creates = mock(async (options: any) => ({ ...options, id: 'created' }));
	const response = mock(async (_value: unknown) => undefined);
	const value = {
		user: { id: 'admin' },
		guildId: 'guild',
		client: { user: { id: 'bot' }, options: { intents: new IntentsBitField() } },
		member: {},
		memberPermissions: { has: () => true },
		guild: {
			id: 'guild',
			members: { me: {} },
			roles: { fetch: async (id: string) => ({ id }) },
			channels: { fetch: async () => channel },
			autoModerationRules: { fetch: async () => rules, create: creates }
		},
		options: {
			getSubcommand: () => values.subcommand ?? 'native',
			getString: (key: string) => values[key] ?? null,
			getInteger: (key: string) => values[key] ?? null,
			getBoolean: (key: string) => values[key] ?? null,
			getChannel: () => (values.alert_channel ? channel : null)
		},
		deferReply: async () => undefined,
		editReply: response
	};
	return { value: value as unknown as RadonCommand.ChatInputCommandInteraction, response, creates };
}

describe('AutoMod command safety', () => {
	it('disables existing message rules without dereferencing an omitted alert channel', async () => {
		for (const module of ['flood', 'links']) {
			existingConfig = { alertChannelId: 'existing-alerts' };
			const f = interaction({ subcommand: module, mode: 'off' });
			await command.chatInputRun(f.value);
			expect((writes.mock.calls.at(-1)![0] as any).update[`${module === 'links' ? 'link' : module}Mode`]).toBe('off');
			expect(displayText(f.response.mock.calls[0][0])).toContain(`${module}: off`);
		}
	});
	it('persists raid mode off before requesting early restoration', async () => {
		existingConfig = { alertChannelId: 'existing-alerts' };
		const restore = spyOn(autoModService, 'restoreRaid').mockImplementation(async () => {
			expect(writes).toHaveBeenCalledTimes(1);
		});
		try {
			const f = interaction({ subcommand: 'raid', mode: 'off' });
			await command.chatInputRun(f.value);
			expect((writes.mock.calls[0][0] as any).update.raidMode).toBe('off');
			expect(restore).toHaveBeenCalledWith(testContainer.prisma, f.value.guild, true);
			expect(displayText(f.response.mock.calls[0][0])).toContain('raid: off');
		} finally {
			restore.mockRestore();
		}
	});
	it('refuses content inspection before runtime intent opt-in without writing configuration', async () => {
		const f = interaction({ subcommand: 'flood', mode: 'observe', alert_channel: true });
		await command.chatInputRun(f.value);
		expect(displayText(f.response.mock.calls[0][0])).toContain('RADON_AUTOMOD_CONTENT_ENABLED=true');
		expect(writes).not.toHaveBeenCalled();
	});
	it('refuses join inspection before runtime intent opt-in without writing configuration', async () => {
		const f = interaction({ subcommand: 'raid', mode: 'observe', alert_channel: true });
		await command.chatInputRun(f.value);
		expect(displayText(f.response.mock.calls[0][0])).toContain('RADON_AUTOMOD_MEMBERS_ENABLED=true');
		expect(writes).not.toHaveBeenCalled();
	});
	it('does not create configuration when disabling a rule that was never enabled', async () => {
		const f = interaction({ subcommand: 'flood', mode: 'off' });
		await command.chatInputRun(f.value);
		expect(displayText(f.response.mock.calls[0][0])).toContain('This custom rule is already off.');
		expect(writes).not.toHaveBeenCalled();
	});
	it('registers a Discord-valid guild-only command with all intended routes', () => {
		let json: any;
		command.registerApplicationCommands({
			registerChatInputCommand: (build: (b: SlashCommandBuilder) => SlashCommandBuilder) => {
				json = build(new SlashCommandBuilder()).toJSON();
			}
		} as unknown as RadonCommand.Registry);
		expect(json.options.map((o: any) => o.name)).toEqual(['native', 'flood', 'links', 'raid', 'exemptions', 'status', 'remove']);
		expect(json.default_member_permissions).toBe('32');
		expect(json.contexts).toEqual([0]);
	});
	it('requires actual Manage Server permission even with a configured administrator role', async () => {
		const f = interaction({ preset: 'mentions', mode: 'observe', alert_channel: true });
		(f.value as any).memberPermissions.has = () => false;
		await command.chatInputRun(f.value);
		expect(displayText(f.response.mock.calls[0][0])).toContain('Manage Server is required to configure AutoMod.');
		expect(f.creates).not.toHaveBeenCalled();
	});
	it('does not delete a matching rule created by an administrator or another bot', async () => {
		const remove = mock(async () => undefined);
		const rules = new Collection([['other', { name: 'Radon: mentions', creatorId: 'other', delete: remove }]]);
		const f = interaction({ subcommand: 'remove', preset: 'mentions' }, rules);
		await command.chatInputRun(f.value);
		expect(remove).not.toHaveBeenCalled();
		expect(displayText(f.response.mock.calls[0][0])).toContain('No matching native rule owned by this bot was found.');
	});
	it('disables an owned native rule without requiring new keywords or an alert channel', async () => {
		const disable = mock(async () => undefined);
		const rules = new Collection([['owned', { name: 'Radon: keywords', creatorId: 'bot', setEnabled: disable }]]);
		const f = interaction({ preset: 'keywords', mode: 'off' }, rules);
		await command.chatInputRun(f.value);
		expect(disable).toHaveBeenCalledWith(false, 'Requested by admin');
		expect(f.creates).not.toHaveBeenCalled();
	});
	it('preserves existing keywords and exemptions when changing the native mode', async () => {
		const edit = mock(async (options: any) => ({ ...options, id: 'owned' }));
		const role = '223456789012345678';
		const excluded = '323456789012345678';
		const rules = new Collection([
			[
				'owned',
				{
					name: 'Radon: keywords',
					creatorId: 'bot',
					exemptRoles: new Collection([[role, {}]]),
					exemptChannels: new Collection([[excluded, {}]]),
					triggerMetadata: { keywordFilter: ['scam*'] },
					edit
				}
			]
		]);
		const f = interaction({ preset: 'keywords', mode: 'observe', alert_channel: true }, rules);
		await command.chatInputRun(f.value);
		expect(edit).toHaveBeenCalledTimes(1);
		expect(edit.mock.calls[0][0].exemptRoles).toEqual([role]);
		expect(edit.mock.calls[0][0].exemptChannels).toEqual([excluded]);
		expect(edit.mock.calls[0][0].triggerMetadata.keywordFilter).toEqual(['scam*']);
	});
});
