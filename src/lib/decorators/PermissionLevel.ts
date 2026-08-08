import type { RadonCommand } from '#lib/structures';
import { isAdmin, isGuildOwner, isModerator, isOwner } from '#lib/utility';
import { UserError } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';

export const PermissionLevel = (level: PermissionLevel) => {
	return function <This, Args extends [RadonCommand.ChatInputCommandInteraction, ...unknown[]], Return>(
		method: (this: This, ...args: Args) => Return,
		_context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
	) {
		return function (this: This, ...args: Args): Return {
			const interaction = args[0];

			const check = async () => {
				const adminRoles = (await interaction.guild.settings?.roles.admins) ?? [];
				const modRoles = (await interaction.guild.settings?.roles.mods) ?? [];

				const admin = isAdmin(interaction.member as GuildMember) || interaction.member.roles.cache.some((r) => adminRoles.includes(r.id));

				const mod = admin || isModerator(interaction.member) || interaction.member.roles.cache.some((r) => modRoles.includes(r.id));

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

			return check().then(() => method.apply(this, args)) as Return;
		};
	};
};

export type PermissionLevel = 'Administrator' | 'Moderator' | 'ServerOwner' | 'Everyone';
