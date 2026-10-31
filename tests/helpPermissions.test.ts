import { describe, expect, it } from 'bun:test';
import {
	ApplicationCommandPermissionType as Type,
	Collection,
	PermissionFlagsBits as Flags,
	PermissionsBitField,
	type ApplicationCommand,
	type ApplicationCommandPermissions,
	type ChatInputCommandInteraction
} from 'discord.js';
import { canUseApplicationCommand } from '../src/lib/structures/help/applicationPermissions.js';

const guildId = '1000';
const userId = '2000';
const channelId = '3000';
const appId = '4000';
const commandId = '5000';
const roleId = '6000';
const secondRoleId = '6001';
const basePermissions = [Flags.ViewChannel, Flags.UseApplicationCommands];
const overwrite = (id: string, type: Type, permission: boolean): ApplicationCommandPermissions => ({ id, type, permission });

function fixture(
	options: {
		defaults?: bigint | null;
		extraPermissions?: bigint[];
		app?: ApplicationCommandPermissions[];
		command?: ApplicationCommandPermissions[];
		thread?: boolean;
	} = {}
) {
	const permissions = new Collection<string, ApplicationCommandPermissions[]>();
	if (options.app) permissions.set(appId, options.app);
	if (options.command) permissions.set(commandId, options.command);
	const available = new PermissionsBitField([...basePermissions, ...(options.extraPermissions ?? [])]);
	const command = {
		id: commandId,
		applicationId: appId,
		defaultMemberPermissions: options.defaults === null || options.defaults === undefined ? null : new PermissionsBitField(options.defaults)
	} as ApplicationCommand;
	const interaction = {
		user: { id: userId },
		guildId,
		channelId,
		channel: { isThread: () => options.thread ?? false, parentId: options.thread ? '7000' : null },
		member: {
			permissions: available,
			roles: {
				cache: new Collection([
					[roleId, {}],
					[secondRoleId, {}]
				])
			}
		},
		memberPermissions: available
	} as unknown as ChatInputCommandInteraction<'cached'>;
	return { command, interaction, permissions, allowed: () => canUseApplicationCommand(command, interaction, permissions) };
}

describe('Discord application command eligibility', () => {
	it('honors unrestricted defaults, required permissions, and administrator-only defaults', () => {
		expect(fixture().allowed()).toBe(true);
		expect(fixture({ defaults: Flags.ManageRoles }).allowed()).toBe(false);
		expect(fixture({ defaults: Flags.ManageRoles, extraPermissions: [Flags.ManageRoles] }).allowed()).toBe(true);
		expect(fixture({ defaults: 0n }).allowed()).toBe(false);
	});

	it('requires access to the channel and application commands', () => {
		const missing = fixture();
		missing.interaction.memberPermissions.remove(Flags.UseApplicationCommands);
		expect(missing.allowed()).toBe(false);
		const invisible = fixture();
		invisible.interaction.memberPermissions.remove(Flags.ViewChannel);
		expect(invisible.allowed()).toBe(false);
	});

	it('lets administrators bypass every command overwrite', () => {
		expect(
			fixture({
				defaults: 0n,
				extraPermissions: [Flags.Administrator],
				command: [overwrite(userId, Type.User, false), overwrite('999', Type.Channel, false)]
			}).allowed()
		).toBe(true);
	});

	it('inherits app-wide permissions only while the command is synced', () => {
		const app = [overwrite(guildId, Type.Role, false)];
		expect(fixture({ app }).allowed()).toBe(false);
		expect(fixture({ app, command: [] }).allowed()).toBe(true);
		expect(fixture({ app, command: [overwrite(guildId, Type.Role, true)] }).allowed()).toBe(true);
	});

	it('uses matching roles over everyone, allows over conflicting role denies, and user over roles', () => {
		const roles = [overwrite(guildId, Type.Role, false), overwrite(roleId, Type.Role, false), overwrite(secondRoleId, Type.Role, true)];
		expect(fixture({ command: roles }).allowed()).toBe(true);
		expect(fixture({ command: [...roles, overwrite(userId, Type.User, false)] }).allowed()).toBe(false);
		expect(fixture({ defaults: 0n, command: [overwrite(userId, Type.User, true)] }).allowed()).toBe(true);
		expect(fixture({ command: [overwrite(roleId, Type.Role, false)] }).allowed()).toBe(false);
	});

	it('preserves default requirements for an everyone allow, but permits explicit role grants', () => {
		expect(fixture({ defaults: 0n, command: [overwrite(guildId, Type.Role, true)] }).allowed()).toBe(false);
		expect(fixture({ defaults: Flags.ManageRoles, command: [overwrite(guildId, Type.Role, true)] }).allowed()).toBe(false);
		expect(fixture({ defaults: 0n, command: [overwrite(roleId, Type.Role, true)] }).allowed()).toBe(true);
	});

	it('ignores overwrites for unrelated users and roles', () => {
		expect(fixture({ command: [overwrite('9000', Type.User, false), overwrite('9001', Type.Role, false)] }).allowed()).toBe(true);
	});

	it('requires both member and channel access, with specific channels overriding all channels', () => {
		expect(fixture({ command: [overwrite('999', Type.Channel, false)] }).allowed()).toBe(false);
		expect(fixture({ command: [overwrite('999', Type.Channel, false), overwrite(channelId, Type.Channel, true)] }).allowed()).toBe(true);
		expect(fixture({ command: [overwrite(userId, Type.User, true), overwrite(channelId, Type.Channel, false)] }).allowed()).toBe(false);
		expect(fixture({ defaults: 0n, command: [overwrite(channelId, Type.Channel, true)] }).allowed()).toBe(false);
	});

	it('inherits thread channel restrictions from the parent', () => {
		expect(fixture({ thread: true, command: [overwrite('7000', Type.Channel, false)] }).allowed()).toBe(false);
		expect(fixture({ thread: true, command: [overwrite(channelId, Type.Channel, false)] }).allowed()).toBe(true);
	});
});
