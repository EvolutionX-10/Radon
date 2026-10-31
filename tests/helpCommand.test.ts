import { afterAll, beforeAll, describe, expect, it, mock, spyOn } from 'bun:test';
import { SapphireClient, type Command } from '@sapphire/framework';
import { fileURLToPath } from 'node:url';
import {
	ApplicationCommand,
	ChannelType,
	Collection,
	ComponentType,
	ContextMenuCommandBuilder,
	MessageFlags,
	PermissionFlagsBits,
	PermissionsBitField,
	SlashCommandBuilder,
	type ApplicationCommandPermissions
} from 'discord.js';
import { UserCommand as HelpCommand } from '../src/commands/General/help.js';
import { UserCommand as AboutCommand } from '../src/commands/General/about.js';
import { UserCommand as StatsCommand } from '../src/commands/General/stats.js';
import { UserCommand as WarnCommand } from '../src/commands/Moderation/warn.js';
import { UserCommand as LockCommand } from '../src/commands/Utility/lock.js';
import { UserCommand as RoleCommand } from '../src/commands/Utility/role.js';
import { UserCommand as EvalCommand } from '../src/commands/Core/eval.js';
import { RadonCommand } from '../src/lib/structures/commands/RadonCommand.js';
import { canDiscoverCommand } from '../src/lib/structures/help/catalogue.js';
import { PermissionLevels } from '../src/lib/types/permissionLevels.js';
import type { HelpEntry } from '../src/lib/structures/help/layout.js';
import { PermissionLevel } from '../src/lib/decorators/PermissionLevel.js';
import { getSubcommandPermissions } from '../src/lib/structures/help/subcommandPermissions.js';

const client = new SapphireClient({
	intents: [],
	baseUserDirectory: null,
	loadDefaultErrorListeners: false,
	loadApplicationCommandRegistriesStatusListeners: false
});
const commands = client.stores.get('commands');
const registered: { command: ApplicationCommand; guildIds?: string[] }[] = [];
let help: HelpCommand;
let warn: WarnCommand;
let lock: LockCommand;
let community: RadonCommand;
let serverOwner: RadonCommand;
let nextId = 10000;

function load<T extends RadonCommand>(
	Constructor: new (context: Command.LoaderContext, options?: RadonCommand.Options) => T,
	name: string,
	options: RadonCommand.Options = {}
) {
	const command = new Constructor({ name, path: `/virtual/General/${name}.ts`, root: '/virtual', store: commands }, options);
	commands.set(command.name, command);
	const registry = command.applicationCommandRegistry;
	const capture = (builder: (builder: any) => any, registrationOptions?: { guildIds?: string[] }, contextMenu = false) => {
		const data = builder(contextMenu ? new ContextMenuCommandBuilder() : new SlashCommandBuilder()).toJSON();
		const registeredCommand = new ApplicationCommand(client, { ...data, id: String(nextId++), application_id: '999999', version: '1' });
		registered.push({ command: registeredCommand, guildIds: registrationOptions?.guildIds });
		(contextMenu ? registry.contextMenuCommands : registry.chatInputCommands).add(data.name);
	};
	command.registerApplicationCommands?.({
		registerChatInputCommand: (builder: any, opts: any) => capture(builder, opts),
		registerContextMenuCommand: (builder: any, opts: any) => capture(builder, opts, true)
	} as unknown as RadonCommand.Registry);
	return command;
}

class TestCommand extends RadonCommand {
	public override chatInputRun() {}
}

beforeAll(async () => {
	await client.stores
		.get('preconditions')
		.registerPath(fileURLToPath(new URL('../src/preconditions/', import.meta.url)))
		.loadAll();
	help = load(HelpCommand, 'help');
	load(AboutCommand, 'about');
	load(StatsCommand, 'stats');
	warn = load(WarnCommand, 'warn');
	lock = load(LockCommand, 'lock');
	load(RoleCommand, 'role');
	load(EvalCommand, 'eval');
	community = load(TestCommand, 'community-test', { community: true });
	serverOwner = load(TestCommand, 'serverowner-test', { permissionLevel: PermissionLevels.ServerOwner });
});

afterAll(async () => {
	await client.destroy();
});

type Profile = {
	id?: string;
	guildId?: string;
	permissions?: bigint[];
	roles?: { id: string; name: string }[];
	adminRoles?: string[];
	modRoles?: string[];
	community?: boolean;
	discordGrant?: boolean;
	botPermissions?: bigint[];
};
function makeInteraction(profile: Profile = {}) {
	const id = profile.id ?? '123456';
	const guildId = profile.guildId ?? '944833697251721246';
	const user = { id };
	const memberPermissions = new PermissionsBitField([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.UseApplicationCommands,
		...(profile.permissions ?? [])
	]);
	const guild = {
		id: guildId,
		ownerId: '654321',
		features: profile.community ? ['COMMUNITY'] : [],
		settings: {
			roles: {
				admins: Promise.resolve(profile.adminRoles ?? []),
				mods: Promise.resolve(profile.modRoles ?? []),
				snapshot: async () => ({ admins: profile.adminRoles ?? [], mods: profile.modRoles ?? [] })
			}
		}
	};
	const channel = {
		id: '222222',
		type: ChannelType.GuildText,
		isDMBased: () => false,
		isThread: () => false,
		permissionsFor: () => new PermissionsBitField(profile.botPermissions ?? PermissionsBitField.All)
	};
	const permissions = new Collection<string, ApplicationCommandPermissions[]>();
	if (profile.discordGrant) for (const { command } of registered) permissions.set(command.id, [{ id, type: 2, permission: true }]);
	const globalCommands = new Collection(registered.filter((r) => !r.guildIds?.length).map((r) => [r.command.id, r.command]));
	const guildCommands = new Collection(registered.filter((r) => r.guildIds?.includes(guildId)).map((r) => [r.command.id, r.command]));
	const handlers = new Map<string, (...args: any[]) => unknown>();
	const collector = {
		ended: false,
		on: (event: string, fn: (...args: any[]) => unknown) => {
			handlers.set(event, fn);
			return collector;
		}
	};
	const message = { createMessageComponentCollector: mock(() => collector) };
	const edits: any[] = [];
	const interaction = {
		user,
		guildId,
		guild,
		channelId: channel.id,
		channel,
		applicationId: '999999',
		memberPermissions,
		member: { id, user, guild, permissions: memberPermissions, roles: { cache: new Collection((profile.roles ?? []).map((r) => [r.id, r])) } },
		client: { application: { commands: { fetch: mock(async () => globalCommands) } }, channels: { fetch: mock(async () => channel) } },
		inGuild: () => true,
		deferReply: mock(async () => {}),
		editReply: mock(async (payload: any) => {
			edits.push(payload);
			return message;
		})
	};
	Object.assign(guild, { commands: { fetch: mock(async () => guildCommands), permissions: { fetch: mock(async () => permissions) } } });
	return { interaction: interaction as unknown as RadonCommand.ChatInputCommandInteraction, edits, collector, handlers, message };
}

async function entriesFor(profile: Profile = {}) {
	const session = makeInteraction(profile);
	// Exercise discovery separately from rendering so every page can be inspected.
	const entries = await (help as unknown as { getEntries: (i: RadonCommand.ChatInputCommandInteraction) => Promise<HelpEntry[]> }).getEntries(
		session.interaction
	);
	return { names: entries.map((e) => e.name), entries, ...session };
}
function payloadText(payload: any) {
	return (
		payload.components
			?.map((c: any) => c.toJSON?.() ?? c)
			.flatMap((c: any) => c.components.filter((i: any) => i.type === ComponentType.TextDisplay).map((i: any) => i.content))
			.join('\n') ?? ''
	);
}
function component(id: string, userId = '123456', value?: string) {
	const edits: any[] = [];
	return {
		customId: id,
		user: { id: userId },
		values: value ? [value] : [],
		isButton: () => !value,
		isStringSelectMenu: () => !!value,
		deferUpdate: mock(async () => {}),
		reply: mock(async () => {}),
		editReply: mock(async (p: any) => {
			edits.push(p);
		}),
		edits
	};
}
const nativeModPermissions = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];

describe('help discovery with actual commands and preconditions', () => {
	it('shows regular members public slash routes and hides owner/moderator commands', async () => {
		const { names } = await entriesFor();
		expect(names).toContain('/help');
		expect(names).toContain('/about me');
		expect(names.some((name) => name.startsWith('/lock'))).toBe(false);
		expect(names.some((name) => name.startsWith('/warn'))).toBe(false);
		expect(names).not.toContain('/stats');
		expect(names.some((name) => name.endsWith('eval'))).toBe(false);
	});
	it('honors configured moderator roles and the stricter subcommand guards', async () => {
		const { names } = await entriesFor({
			roles: [{ id: 'mod', name: 'Staff' }],
			modRoles: ['mod'],
			permissions: nativeModPermissions,
			discordGrant: true
		});
		expect(names).toContain('/lock text');
		expect(names).toContain('/warn action list');
		expect(names).not.toContain('/lock all text');
		expect(names).not.toContain('/lock server');
		expect(names).not.toContain('/warn action create');
		expect(names).not.toContain('/warn action remove');
	});
	it('discovers administrator-only routes for a configured admin role, and excludes disabled bulk routes', async () => {
		const { names } = await entriesFor({ roles: [{ id: 'admin', name: 'Staff' }], adminRoles: ['admin'], discordGrant: true });
		expect(names).toContain('/lock all text');
		expect(names).toContain('/lock server');
		expect(names).toContain('/warn action create');
		expect(names).toContain('/warn action remove');
		expect(names.some((name) => name.startsWith('/role bulk'))).toBe(false);
	});
	it('generates required arguments and right-click usage from registered command metadata', async () => {
		const { entries } = await entriesFor({ id: '697795666373640213', discordGrant: true });
		expect(entries.find((entry) => entry.name === '/about user')?.usage).toContain('<user>');
		expect(entries.find((entry) => entry.name === 'Warn List')?.usage).toContain('Right-click a user → Apps');
		expect(entries.find((entry) => entry.name === '/warn action create')?.usage).toContain('<severity>');
	});
	it('uses the bot-owner override while preserving registration scope', async () => {
		const eligible = await entriesFor({ id: '697795666373640213', discordGrant: true });
		expect(eligible.names).toContain('/stats');
		expect(eligible.names).toContain('/lock all text');
		expect(eligible.names.some((name) => name.endsWith('eval'))).toBe(true);
		const elsewhere = await entriesFor({ id: '697795666373640213', guildId: '777777', discordGrant: true });
		expect(elsewhere.names).not.toContain('/stats');
	});
	it('evaluates community eligibility and the server-owner slash precondition without throwing', async () => {
		expect(await canDiscoverCommand(community, makeInteraction().interaction)).toBe(false);
		expect(await canDiscoverCommand(community, makeInteraction({ community: true }).interaction)).toBe(true);
		expect(await canDiscoverCommand(serverOwner, makeInteraction().interaction)).toBe(false);
		expect(await canDiscoverCommand(serverOwner, makeInteraction({ id: '654321' }).interaction)).toBe(true);
	});
	it('keeps cooldowns untouched during discovery and hides disabled commands or missing bot permissions', async () => {
		const i = makeInteraction({
			id: '700001',
			roles: [{ id: 'mod', name: 'Moderator' }],
			modRoles: ['mod'],
			permissions: nativeModPermissions
		}).interaction;
		for (let n = 0; n < 5; n++) expect(await canDiscoverCommand(lock, i)).toBe(true);
		for (let n = 0; n < 3; n++) expect((await lock.preconditions.chatInputRun(i, lock, {})).isOk()).toBe(true);
		expect((await lock.preconditions.chatInputRun(i, lock, {})).isOk()).toBe(false);
		lock.enabled = false;
		try {
			expect(await canDiscoverCommand(lock, i)).toBe(false);
		} finally {
			lock.enabled = true;
		}
		expect(await canDiscoverCommand(warn, makeInteraction({ id: '697795666373640213', botPermissions: [] }).interaction)).toBe(false);
	});
	it('enforces the same administrator route guard used by help under Bun', async () => {
		const interaction = makeInteraction({ roles: [{ id: 'mod', name: 'Staff' }], modRoles: ['mod'] }).interaction;
		const guardedWarn = warn as unknown as { createAction: (i: RadonCommand.ChatInputCommandInteraction) => Promise<unknown> };
		await expect(guardedWarn.createAction(interaction)).rejects.toMatchObject({ identifier: 'PermissionLevelError' });
	});
	it('records method decorator route metadata on command instances', () => {
		expect(warn.subcommandPermissions.get('action create')).toBe('Administrator');
		expect(lock.subcommandPermissions.get('all text')).toBe('Administrator');
		expect(lock.subcommandPermissions.get('server')).toBe('Administrator');
	});
});

describe('permission decorator runtime compatibility', () => {
	for (const mode of ['standard', 'legacy'] as const) {
		it(`preserves execution and route metadata with ${mode} decorators`, async () => {
			const original = mock((_interaction: RadonCommand.ChatInputCommandInteraction, value: string) => value.toUpperCase());
			const prototype = { route: original };
			const decorator = PermissionLevel('Administrator', 'restricted route');
			if (mode === 'legacy') {
				Object.defineProperty(prototype, 'route', decorator(prototype, 'route', Object.getOwnPropertyDescriptor(prototype, 'route')!));
			} else {
				prototype.route = decorator(original, {} as ClassMethodDecoratorContext) as typeof original;
			}
			const instance = Object.create(prototype) as typeof prototype;
			const allowed = makeInteraction({ roles: [{ id: 'admin', name: 'Staff' }], adminRoles: ['admin'] }).interaction;
			expect(await instance.route(allowed, 'payload')).toBe('PAYLOAD');
			expect(original).toHaveBeenCalledTimes(1);
			await expect(instance.route(makeInteraction().interaction, 'denied')).rejects.toMatchObject({ identifier: 'PermissionLevelError' });
			expect(original).toHaveBeenCalledTimes(1);
			expect(getSubcommandPermissions(instance).get('restricted route')).toBe('Administrator');
		});
	}
});

describe('help collector lifecycle', () => {
	it('returns a friendly error without starting a collector when Discord fetches fail', async () => {
		const session = makeInteraction();
		(session.interaction.client.application.commands.fetch as ReturnType<typeof mock>).mockRejectedValueOnce(new Error('Discord unavailable'));
		const logger = spyOn(client.logger, 'error').mockImplementation(() => {});
		try {
			await help.chatInputRun(session.interaction);
			expect(session.edits).toHaveLength(1);
			expect(session.edits[0].content).toContain('Please try /help again');
			expect(session.message.createMessageComponentCollector).not.toHaveBeenCalled();
			expect(logger).toHaveBeenCalledTimes(1);
		} finally {
			logger.mockRestore();
		}
	});
	it('serializes rapid clicks so both page changes are preserved', async () => {
		const session = makeInteraction({ id: '697795666373640213', discordGrant: true });
		await help.chatInputRun(session.interaction);
		const first = component('help:next', '697795666373640213');
		const second = component('help:next', '697795666373640213');
		await Promise.all([session.handlers.get('collect')!(first), session.handlers.get('collect')!(second)]);
		expect(payloadText(first.edits[0])).toContain('Page 2 /');
		expect(payloadText(second.edits[0])).toContain('Page 3 /');
	});
	it('keeps the final controls disabled when expiry occurs during an in-flight edit', async () => {
		const session = makeInteraction({ id: '697795666373640213', discordGrant: true });
		await help.chatInputRun(session.interaction);
		let start!: () => void;
		let release!: () => void;
		const started = new Promise<void>((resolve) => {
			start = resolve;
		});
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const first = component('help:next', '697795666373640213');
		first.editReply = mock(async (payload: unknown) => {
			first.edits.push(payload);
			start();
			await gate;
		});
		const pendingFirst = session.handlers.get('collect')!(first);
		await started;
		const second = component('help:next', '697795666373640213');
		const pendingSecond = session.handlers.get('collect')!(second);
		session.collector.ended = true;
		session.handlers.get('end')!();
		release();
		await Promise.all([pendingFirst, pendingSecond]);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(second.edits).toHaveLength(0);
		const expired = session.edits.at(-1);
		expect(payloadText(expired)).toContain('session has expired');
		for (const row of expired.components[0].toJSON().components.filter((c: any) => c.type === ComponentType.ActionRow))
			expect(row.components.every((c: any) => c.disabled)).toBe(true);
	});

	it('opens private Components V2 help, paginates and resets the page when selecting a category', async () => {
		const session = makeInteraction({ id: '697795666373640213', discordGrant: true });
		await help.chatInputRun(session.interaction);
		expect(session.interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
		expect(session.edits[0].flags).toBe(MessageFlags.IsComponentsV2);
		const next = component('help:next', '697795666373640213');
		await session.handlers.get('collect')!(next);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(payloadText(next.edits[0])).toContain('Page 2 /');
		const category = component('help:category', '697795666373640213', 'General');
		await session.handlers.get('collect')!(category);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(payloadText(category.edits[0])).toContain('Page 1 /');
	});
	it('rejects other users without changing the session, and disables every control on expiry', async () => {
		const session = makeInteraction();
		await help.chatInputRun(session.interaction);
		const stranger = component('help:next', 'other-user');
		await session.handlers.get('collect')!(stranger);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(stranger.reply).toHaveBeenCalledTimes(1);
		expect(stranger.deferUpdate).not.toHaveBeenCalled();
		expect(stranger.edits).toHaveLength(0);
		session.collector.ended = true;
		session.handlers.get('end')!();
		await new Promise((resolve) => setTimeout(resolve, 0));
		const expired = session.edits.at(-1);
		expect(payloadText(expired)).toContain('session has expired');
		for (const row of expired.components[0].toJSON().components.filter((c: any) => c.type === ComponentType.ActionRow))
			expect(row.components.every((c: any) => c.disabled)).toBe(true);
	});
});
