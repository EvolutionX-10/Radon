import type { RadonCommand } from '#lib/structures';
import { isAdmin, isGuildOwner, isModerator, isOwner } from '#lib/utility';
import { UserError } from '@sapphire/framework';
import { registerSubcommandPermission } from '../structures/help/subcommandPermissions.js';

export const PermissionLevel = (level: PermissionLevel, subcommand?: string) => {
	function decorate<This, Args extends [RadonCommand.ChatInputCommandInteraction, ...unknown[]], Return>(
		method: (this: This, ...args: Args) => Return,
		context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
	): (this: This, ...args: Args) => Return;
	function decorate(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
	function decorate(methodOrTarget: unknown, _contextOrKey: unknown, descriptor?: PropertyDescriptor): unknown {
		// Bun 1.3 uses legacy decorators; TypeScript also supports the standard signature.
		const method = (descriptor?.value ?? methodOrTarget) as (...args: [RadonCommand.ChatInputCommandInteraction, ...unknown[]]) => unknown;
		const guarded = function (this: unknown, ...args: [RadonCommand.ChatInputCommandInteraction, ...unknown[]]) {
			const interaction = args[0];

			const check = async () => {
				const roles = await interaction.guild.settings?.roles.snapshot();
				const adminRoles = roles?.admins ?? [];
				const modRoles = roles?.mods ?? [];

				const admin = isAdmin(interaction.member) || interaction.member.roles.cache.some((r) => adminRoles.includes(r.id));

				const mod = isModerator(interaction.member, [...adminRoles, ...modRoles]);

				const serverowner = isGuildOwner(interaction.member);

				if (isOwner(interaction.user)) {
					return;
				}

				switch (level) {
					case 'Administrator':
						if (!admin) {
							throw new UserError({
								identifier: 'PermissionLevelError',
								message: 'Only for Admins pal'
							});
						}
						break;

					case 'Moderator':
						if (!mod) {
							throw new UserError({
								identifier: 'PermissionLevelError',
								message: "You ain't a mod bruh"
							});
						}
						break;

					case 'ServerOwner':
						if (!serverowner) {
							throw new UserError({
								identifier: 'PermissionLevelError',
								message: "You ain't the server owner"
							});
						}
						break;

					case 'Everyone':
						break;
				}
			};

			return check().then(() => method.apply(this, args));
		};
		if (subcommand) registerSubcommandPermission(guarded, subcommand, level);
		return descriptor ? { ...descriptor, value: guarded } : guarded;
	}
	return decorate;
};

export type PermissionLevel = 'Administrator' | 'Moderator' | 'ServerOwner' | 'Everyone';
