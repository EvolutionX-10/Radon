import { describe, expect, it, mock } from 'bun:test';
import { ButtonStyle, ComponentType, IntentsBitField, MessageFlags, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { UserCommand as Setup } from '../src/commands/Admin/setup.js';
import { UserCommand as Debug } from '../src/commands/Admin/debug.js';
import { UserCommand as Doctor } from '../src/commands/Admin/doctor.js';
import { draftConfiguration, readConfiguration, saveSetup } from '../src/lib/setup/configuration.js';
import { configurationPages, setupScreen } from '../src/lib/setup/presentation.js';
import { diagnosticPages } from '../src/lib/setup/diagnostics.js';
import { componentMessage } from '../src/lib/presentation/components.js';
import { setupFixture, ids } from './fixtures/setup.js';
import { displayText } from './fixtures/presentation.js';

const open = (f: ReturnType<typeof setupFixture>) => Setup.prototype.chatInputRun.call(f.commandContext as any, f.interaction);
async function click(f: ReturnType<typeof setupFixture>, id: string, values?: string[]) {
	await f.handlers.get('collect')!(f.component(id, values));
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
function components(payload: any) {
	const found: any[] = [];
	const visit = (items: any[]) => {
		for (const item of items ?? []) {
			const data = item.toJSON?.() ?? item;
			found.push(data);
			visit(data.components);
			if (data.accessory) visit([data.accessory]);
		}
	};
	visit(payload.components);
	return found;
}
function valid(payload: any) {
	expect(payload.flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
	expect(payload.content ?? null).toBeNull();
	expect(payload.embeds ?? []).toEqual([]);
	expect(displayText(payload).length).toBeLessThanOrEqual(4000);
	expect(components(payload).length).toBeLessThanOrEqual(40);
}

function saved(f: ReturnType<typeof setupFixture>) {
	f.state.settings = { id: ids.guild, configured: true, modRoles: [ids.mod], adminRoles: [ids.admin], modLogChannel: ids.log } as any;
	f.state.reports = { id: ids.guild, channelId: ids.report };
}

describe('setup draft, save, and component authorization', () => {
	it('loads all three commands through actual Sapphire constructors and inherited decorators', async () => {
		const child = Bun.spawn([process.execPath, new URL('./fixtures/setupCommands.ts', import.meta.url).pathname], {
			stdout: 'pipe',
			stderr: 'pipe'
		});
		const [code, output] = await Promise.all([child.exited, new Response(child.stderr).text()]);
		expect(output).toBe('');
		expect(code).toBe(0);
	});
	it('prefills saved roles/channels, retains selections when going back, and does not write until save', async () => {
		const f = setupFixture();
		saved(f);
		await open(f);
		expect(f.interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
		expect(components(f.edits[0]).find((c) => c.custom_id === 'setup:mods').default_values).toEqual([{ id: ids.mod, type: 'role' }]);
		await click(f, 'mods', []);
		await click(f, 'next');
		await click(f, 'back');
		expect(components(f.edits.at(-1)).find((c) => c.custom_id === 'setup:mods').default_values).toEqual([]);
		expect(f.prisma.$transaction).not.toHaveBeenCalled();
		expect(f.guild.channels.create).not.toHaveBeenCalled();
		await click(f, 'cancel');
		await flush();
		expect(f.state.settings?.modRoles).toEqual([ids.mod]);
	});
	it('skips logs and reports safely, saves once, and supports empty optional role lists', async () => {
		const f = setupFixture();
		await open(f);
		await click(f, 'next');
		await click(f, 'skip-log');
		await click(f, 'skip-reports');
		await click(f, 'next');
		await click(f, 'next');
		await Promise.all([click(f, 'save'), click(f, 'save')]);
		await flush();
		expect(f.state.settings).toMatchObject({ configured: true, modLogChannel: '', modRoles: [], adminRoles: [] });
		expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(f.guild.channels.create).not.toHaveBeenCalled();
		expect(displayText(f.edits.at(-1))).toContain('Configuration saved');
		valid(f.edits.at(-1));
	});
	it('creates a private channel only on confirmation and routes reports there atomically', async () => {
		const f = setupFixture();
		await open(f);
		await click(f, 'mods', [ids.mod]);
		await click(f, 'next');
		await click(f, 'new-log');
		await click(f, 'reports-log');
		await click(f, 'next');
		await click(f, 'next');
		expect(f.guild.channels.create).not.toHaveBeenCalled();
		await click(f, 'save');
		await flush();
		expect(f.guild.channels.create).toHaveBeenCalledTimes(1);
		expect(f.state.settings?.modLogChannel).toBe(ids.newLog);
		expect(f.state.reports?.channelId).toBe(ids.newLog);
		const overwrites = f.guild.channels.create.mock.calls[0][0].permissionOverwrites;
		expect(overwrites[0]).toMatchObject({ id: ids.guild, deny: [1024n] });
		expect(overwrites.some((p: any) => p.id === ids.mod)).toBe(true);
	});
	it('keeps existing channel permissions and enabled protection untouched', async () => {
		const f = setupFixture();
		saved(f);
		f.guild.client.options.intents = new IntentsBitField(['MessageContent', 'GuildMembers']);
		f.state.automod = { id: ids.guild, floodMode: 'enforce', raidMode: 'enforce', alertChannelId: ids.report } as any;
		const before = await readConfiguration(f.prisma as any, ids.guild);
		const draft = draftConfiguration(before);
		draft.protection = ['flood', 'raid'];
		await saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft);
		expect(f.log.edit).not.toHaveBeenCalled();
		expect(f.report.edit).not.toHaveBeenCalled();
		expect(f.prisma.automodConfig.upsert).not.toHaveBeenCalled();
		expect(f.state.automod?.floodMode).toBe('enforce');
	});
	it('rejects a stale reviewed snapshot before creating a channel or writing', async () => {
		const f = setupFixture();
		const before = await readConfiguration(f.prisma as any, ids.guild);
		const draft = draftConfiguration(before);
		draft.log = 'create';
		saved(f);
		await expect(saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft)).rejects.toThrow('Configuration changed');
		expect(f.guild.channels.create).not.toHaveBeenCalled();
		expect(f.prisma.$transaction).not.toHaveBeenCalled();
	});
	it('rolls back settings/report writes and retains a created channel on an uncertain save', async () => {
		const f = setupFixture();
		const before = await readConfiguration(f.prisma as any, ids.guild);
		const draft = draftConfiguration(before);
		draft.log = 'create';
		draft.reports = 'log';
		f.prisma.moderationReportSettings.upsert.mockRejectedValueOnce(new Error('Database unavailable'));
		await expect(saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft)).rejects.toThrow(`Created <#${ids.newLog}>`);
		expect(f.state.settings).toBeNull();
		expect(f.created.delete).not.toHaveBeenCalled();
		expect(f.guild.channels.create).toHaveBeenCalledTimes(1);
	});
	it('rejects @everyone, managed roles, removed roles, and overlapping staff selections', async () => {
		for (const id of [ids.guild, ids.mod, 'removed']) {
			const f = setupFixture();
			const before = await readConfiguration(f.prisma as any, ids.guild);
			const draft = draftConfiguration(before);
			draft.modRoles = [id];
			if (id === ids.mod) f.roles.get(id)!.managed = true;
			await expect(saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft)).rejects.toThrow('staff roles');
			expect(f.prisma.$transaction).not.toHaveBeenCalled();
		}
		const f = setupFixture();
		await open(f);
		await click(f, 'mods', [ids.mod]);
		await click(f, 'admins', [ids.mod]);
		await click(f, 'next');
		expect(displayText(f.edits.at(-1))).toContain('Choose separate');
		await click(f, 'cancel');
	});
	it('rejects public report destinations and missing bot or actor channel access', async () => {
		for (const mode of ['public', 'bot', 'actor']) {
			const f = setupFixture();
			const before = await readConfiguration(f.prisma as any, ids.guild);
			const draft = draftConfiguration(before);
			draft.reports = 'existing';
			draft.reportChannelId = mode === 'public' ? ids.log : ids.report;
			if (mode !== 'public')
				f.report.permissionsFor = (target: any) =>
					target.id === (mode === 'bot' ? ids.bot : ids.actor)
						? new PermissionsBitField()
						: new PermissionsBitField(PermissionsBitField.All);
			await expect(saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft)).rejects.toThrow();
			expect(f.prisma.$transaction).not.toHaveBeenCalled();
		}
	});
	it('omits deleted channel defaults so an old configuration can still be repaired', async () => {
		const f = setupFixture();
		saved(f);
		f.channels.delete(ids.log);
		f.channels.delete(ids.report);
		await open(f);
		await click(f, 'next');
		const controls = components(f.edits.at(-1));
		expect(controls.find((c) => c.custom_id === 'setup:logs').default_values ?? []).toEqual([]);
		expect(controls.find((c) => c.custom_id === 'setup:reports').default_values ?? []).toEqual([]);
		await click(f, 'skip-log');
		await click(f, 'skip-reports');
		await click(f, 'next');
		expect(displayText(f.edits.at(-1))).toContain('Optional protection');
		await click(f, 'cancel');
	});
	it('uses observers only, preserves existing custom alert routing, and keeps native rules intact', async () => {
		const f = setupFixture();
		saved(f);
		f.guild.client.options.intents = new IntentsBitField(['MessageContent', 'GuildMembers']);
		f.state.automod = { id: ids.guild, floodMode: 'off', raidMode: 'off', alertChannelId: ids.report } as any;
		f.native.set('existing', { id: 'existing', creatorId: ids.bot, name: 'Radon: mentions', enabled: false });
		const before = await readConfiguration(f.prisma as any, ids.guild);
		const draft = draftConfiguration(before);
		draft.protection = ['mentions', 'spam', 'flood', 'raid'];
		const result = await saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft);
		expect(f.state.automod).toMatchObject({ floodMode: 'observe', raidMode: 'observe', alertChannelId: ids.report });
		expect(f.guild.autoModerationRules.create).toHaveBeenCalledTimes(1);
		expect(f.guild.autoModerationRules.create.mock.calls[0][0].actions.every((a: any) => a.type === 2)).toBe(true);
		expect(result.notes.join(' ')).toContain('kept unchanged');
	});
	it('reports native-rule failure after successful settings commit without rolling settings back', async () => {
		const f = setupFixture();
		const before = await readConfiguration(f.prisma as any, ids.guild);
		const draft = draftConfiguration(before);
		draft.log = 'existing';
		draft.logChannelId = ids.log;
		draft.protection = ['spam'];
		f.guild.autoModerationRules.create.mockRejectedValueOnce(new Error('Quota'));
		const result = await saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft);
		expect(f.state.settings?.configured).toBe(true);
		expect(result.notes.join(' ')).toContain('could not confirm');
	});
	it('refuses privileged protection before opt-in and accepts native observers without intents', async () => {
		for (const mode of ['flood', 'raid'] as const) {
			const f = setupFixture();
			const before = await readConfiguration(f.prisma as any, ids.guild);
			const draft = draftConfiguration(before);
			draft.log = 'existing';
			draft.logChannelId = ids.log;
			draft.protection = [mode];
			await expect(saveSetup(f.prisma as any, f.guild as any, ids.actor, before, draft)).rejects.toThrow('unavailable');
			expect(f.prisma.$transaction).not.toHaveBeenCalled();
		}
	});
	it('rejects other users, out-of-stage save clicks, and revoked administrator access', async () => {
		const f = setupFixture();
		await open(f);
		const stranger = f.component('save', undefined, 'another-user' as any);
		await f.handlers.get('collect')!(stranger);
		expect(stranger.reply).toHaveBeenCalledTimes(1);
		expect(stranger.deferUpdate).not.toHaveBeenCalled();
		await click(f, 'save');
		expect(f.prisma.$transaction).not.toHaveBeenCalled();
		f.guild.ownerId = 'other';
		f.actor.permissions = new PermissionsBitField();
		await click(f, 'next');
		await flush();
		expect(displayText(f.edits.at(-1))).toContain('access could not be confirmed');
		expect(f.prisma.$transaction).not.toHaveBeenCalled();
	});
	it('blocks a second local editor, permits viewing, and releases the session on timeout', async () => {
		const f = setupFixture();
		await open(f);
		const second = setupFixture();
		await open(second);
		expect(displayText(second.edits[0])).toContain('Setup already open');
		(second.interaction.options.getSubcommand as any) = () => 'view';
		await open(second);
		expect(displayText(second.edits.at(-1))).toContain('Current configuration');
		expect(second.prisma.$transaction).not.toHaveBeenCalled();
		f.collector.ended = true;
		f.handlers.get('end')!();
		await flush();
		expect(displayText(f.edits.at(-1))).toContain('Nothing was changed');
		second.collector.stop('done');
		await flush();
		const third = setupFixture();
		await open(third);
		expect(displayText(third.edits[0])).toContain('Step 1 of 4');
		await click(third, 'cancel');
	});
	it('keeps a confirmed save result when the collector expires during a database write', async () => {
		const f = setupFixture();
		await open(f);
		await click(f, 'next');
		await click(f, 'next');
		await click(f, 'next');
		let begin!: () => void, release!: () => void;
		const started = new Promise<void>((resolve) => {
				begin = resolve;
			}),
			gate = new Promise<void>((resolve) => {
				release = resolve;
			});
		const transaction = f.prisma.$transaction;
		f.prisma.$transaction = mock(async (run) => {
			begin();
			await gate;
			return transaction(run);
		});
		const saving = click(f, 'save');
		await started;
		f.collector.ended = true;
		f.handlers.get('end')!();
		release();
		await saving;
		await flush();
		expect(displayText(f.edits.at(-1))).toContain('Configuration saved');
		expect(f.state.settings?.configured).toBe(true);
	});
});

describe('read-only configuration and shared diagnostics', () => {
	it('keeps all four wizard stages and views within V2 limits with long saved role lists', () => {
		const f = setupFixture();
		saved(f);
		f.state.settings!.modRoles = Array.from({ length: 25 }, (_, n) => String(100000000000000000n + BigInt(n)));
		f.state.settings!.adminRoles = Array.from({ length: 25 }, (_, n) => String(200000000000000000n + BigInt(n)));
		const draft = draftConfiguration(f.state);
		for (let step = 0; step < 4; step++) valid(componentMessage(setupScreen(draft, step, f.guild as any, true)));
		for (const page of configurationPages(f.state, f.guild as any)) valid(componentMessage(page));
		expect(displayText(componentMessage(configurationPages(f.state, f.guild as any)[0]))).toContain(f.state.settings!.modRoles[0]);
		expect(components(componentMessage(setupScreen(draft, 0, f.guild as any, true))).some((c) => c.type === ComponentType.Thumbnail)).toBe(true);
		expect(components(componentMessage(setupScreen(draft, 3, f.guild as any, true))).find((c) => c.custom_id === 'setup:save').style).toBe(
			ButtonStyle.Success
		);
	});
	it('finds removed roles, unsafe report channels, missing intents and overdue recovery without writes', async () => {
		const f = setupFixture();
		saved(f);
		f.state.settings!.modRoles = ['removed'];
		f.state.reports!.channelId = ids.log;
		f.state.automod = {
			id: ids.guild,
			floodMode: 'enforce',
			linkMode: 'off',
			raidMode: 'observe',
			alertChannelId: ids.report,
			exemptChannelIds: [],
			raidRestoreAt: new Date(Date.now() - 120000),
			raidLeaseUntil: null
		} as any;
		f.prisma.moderationScheduledBan.count.mockResolvedValue(2);
		f.prisma.channelLockSnapshot.count.mockResolvedValue(1);
		const pages = await diagnosticPages(f.prisma as any, f.guild as any);
		const report = pages.map((p) => displayText(componentMessage(p))).join('\n');
		expect(report).toContain('saved staff role(s) were removed');
		expect(report).toContain('visible to @everyone');
		expect(report).toContain('cannot run without Message Content');
		expect(report).toContain('2 temporary ban(s) overdue');
		expect(report).toContain('1 timed lock(s) overdue');
		for (const page of pages) valid(componentMessage(page));
		expect(f.prisma.$transaction).not.toHaveBeenCalled();
		expect(f.log.edit).not.toHaveBeenCalled();
		expect(f.prisma.moderationScheduledBan.count.mock.calls[0][0].where.guildId).toBe(ids.guild);
	});
	it('marks failed database/API reads as unknown and ignores deliberate hidden-channel restrictions', async () => {
		const f = setupFixture();
		f.prisma.guildSettings.findUnique.mockRejectedValueOnce(Error('database'));
		f.app.fetch.mockRejectedValueOnce(Error('network'));
		f.guild.autoModerationRules.fetch.mockRejectedValueOnce(Error('missing permission'));
		f.report.permissionsFor = () => new PermissionsBitField();
		const pages = await diagnosticPages(f.prisma as any, f.guild as any);
		const report = pages.map((p) => displayText(componentMessage(p))).join('\n');
		expect(report).toContain('Could not read saved settings');
		expect(report).toContain('Could not read Discord application access flags');
		expect(report).toContain('Could not inspect native AutoMod');
		expect(report).not.toContain('Too Low');
		expect(report).not.toContain('Administrator solves');
	});
	it('paginates and refreshes private reports, then closes on revoked access', async () => {
		const f = setupFixture();
		saved(f);
		await Debug.prototype.chatInputRun.call(f.commandContext as any, f.interaction);
		expect(f.interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
		const next = { ...f.component('unused'), customId: 'admin-view:next' };
		await f.handlers.get('collect')!(next);
		expect(displayText(f.edits.at(-1))).toContain('Permissions and roles');
		await f.handlers.get('collect')!({ ...next, customId: 'admin-view:refresh' });
		expect(f.guild.channels.fetch.mock.calls.length).toBe(2);
		f.guild.ownerId = 'other';
		f.actor.permissions = new PermissionsBitField();
		f.state.settings!.adminRoles = [];
		await f.handlers.get('collect')!(next);
		await flush();
		expect(displayText(f.edits.at(-1))).toContain('Report closed');
		expect(f.prisma.$transaction).not.toHaveBeenCalled();
	});
	it('registers guild-only setup view/start and both diagnostic names with administrator access', () => {
		for (const [Command, name] of [
			[Setup, 'setup'],
			[Debug, 'debug'],
			[Doctor, 'doctor']
		] as const) {
			let data: any;
			Command.prototype.registerApplicationCommands.call(
				{ name, description: 'Server settings' } as any,
				{
					registerChatInputCommand: (build: any) => {
						data = build(new SlashCommandBuilder()).toJSON();
					}
				} as any
			);
			expect(data.default_member_permissions).toBe('8');
			expect(data.contexts).toEqual([0]);
			if (name === 'setup') expect(data.options.map((o: any) => o.name)).toEqual(['start', 'view']);
		}
		expect(Doctor.prototype.chatInputRun).toBe(Debug.prototype.chatInputRun);
	});
});
