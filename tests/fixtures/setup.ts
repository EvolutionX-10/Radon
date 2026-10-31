import { mock } from 'bun:test';
import { ApplicationFlagsBitField, ChannelType, Collection, IntentsBitField, PermissionsBitField } from 'discord.js';
import type { Configuration } from '../../src/lib/setup/configuration.js';
import type { RadonCommand } from '../../src/lib/structures/commands/RadonCommand.js';

export const ids = {
	guild: '111111111111111111',
	actor: '222222222222222222',
	bot: '333333333333333333',
	mod: '444444444444444444',
	admin: '555555555555555555',
	log: '666666666666666666',
	report: '777777777777777777',
	newLog: '888888888888888888'
};
export function setupFixture() {
	const state: Configuration = { settings: null, reports: null, automod: null };
	const model = (key: keyof Configuration) => ({
		findUnique: mock(async () => structuredClone(state[key])),
		upsert: mock(async (args: any) => {
			(state as any)[key] = state[key] ? { ...state[key], ...args.update } : { ...args.create };
			return state[key];
		}),
		delete: mock(async () => {
			state[key] = null;
		})
	});
	const prisma = {
		guildSettings: model('settings'),
		moderationReportSettings: model('reports'),
		automodConfig: model('automod'),
		moderationScheduledBan: { count: mock(async (_args: any) => 0) },
		channelLockSnapshot: { count: mock(async (_args: any) => 0) },
		$transaction: mock(async (run: (tx: any) => Promise<any>): Promise<any> => {
			const previous = structuredClone(state);
			try {
				return await run(prisma);
			} catch (error) {
				Object.assign(state, previous);
				throw error;
			}
		})
	};
	const role = (id: string, position: number, permissions = new PermissionsBitField()) => ({
		id,
		name: id,
		position,
		managed: false,
		permissions,
		comparePositionTo: (other: any) => position - other.position
	});
	const everyone = role(ids.guild, 0);
	const top = role('999999999999999999', 10);
	const roles = new Collection([
		[ids.guild, everyone],
		[ids.mod, role(ids.mod, 2)],
		[ids.admin, role(ids.admin, 12)],
		[top.id, top]
	]);
	const actor = {
		id: ids.actor,
		permissions: new PermissionsBitField(['ManageGuild']),
		roles: { cache: new Collection([[ids.admin, roles.get(ids.admin)!]]) }
	};
	const me = { id: ids.bot, permissions: new PermissionsBitField(PermissionsBitField.All), roles: { highest: top } };
	const channel = (id: string, privateOnly: boolean) => ({
		id,
		name: id,
		type: ChannelType.GuildText,
		permissionOverwrites: { cache: new Collection() },
		permissionsFor: (target: any) =>
			target.id === ids.guild ? new PermissionsBitField(privateOnly ? [] : ['ViewChannel']) : new PermissionsBitField(PermissionsBitField.All),
		edit: mock(),
		delete: mock()
	});
	const log = channel(ids.log, false),
		report = channel(ids.report, true),
		created = channel(ids.newLog, true);
	const channels = new Collection([
		[ids.log, log],
		[ids.report, report]
	]);
	const native = new Collection<string, any>();
	const app = { flags: new ApplicationFlagsBitField(), fetch: mock(async (): Promise<any> => app) };
	const guild = {
		id: ids.guild,
		name: 'Test server',
		ownerId: ids.actor,
		client: {
			user: { id: ids.bot, displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' },
			options: { intents: new IntentsBitField() },
			application: app
		},
		roles: { everyone, cache: roles, fetch: mock(async () => roles) },
		members: { me, fetch: mock(async () => actor), fetchMe: mock(async () => me) },
		channels: {
			cache: channels,
			fetch: mock(async (id?: string): Promise<any> => (id ? channels.get(id) : channels)),
			create: mock(async (_args: any) => {
				channels.set(created.id, created);
				return created;
			})
		},
		autoModerationRules: {
			fetch: mock(async () => native),
			create: mock(async (args: any) => {
				const rule = { ...args, id: `native-${native.size}`, creatorId: ids.bot };
				native.set(rule.id, rule);
				return rule;
			})
		}
	};
	const handlers = new Map<string, (...args: any[]) => any>();
	const collector = {
		ended: false,
		on: (event: string, run: any) => {
			handlers.set(event, run);
			return collector;
		},
		stop: mock((reason: string) => {
			collector.ended = true;
			handlers.get('end')?.([], reason);
		})
	};
	const message = { createMessageComponentCollector: mock((_args: any) => collector) };
	const edits: any[] = [];
	const interaction = {
		user: { id: ids.actor },
		guildId: ids.guild,
		guild,
		client: guild.client,
		options: { getSubcommand: (_required?: boolean) => 'start' },
		deferReply: mock(async (_args: any) => {}),
		editReply: mock(async (payload: any) => {
			edits.push(payload);
			return message;
		})
	};
	const component = (id: string, values?: string[], userId = ids.actor) => ({
		customId: `setup:${id}`,
		user: { id: userId },
		values: values ?? [],
		isButton: () => !values,
		isRoleSelectMenu: () => !!values && ['mods', 'admins'].includes(id),
		isChannelSelectMenu: () => !!values && ['logs', 'reports'].includes(id),
		isStringSelectMenu: () => !!values && id === 'protection',
		deferUpdate: mock(async () => {}),
		reply: mock(async (_payload: any) => {}),
		editReply: interaction.editReply
	});
	const commandContext = { container: { prisma, logger: { error: mock((_message: string, _error: unknown) => {}) } } };
	return {
		state,
		prisma,
		guild,
		roles,
		channels,
		log,
		report,
		created,
		native,
		app,
		actor,
		me,
		interaction: interaction as unknown as RadonCommand.ChatInputCommandInteraction,
		handlers,
		collector,
		message,
		edits,
		component,
		commandContext
	};
}
