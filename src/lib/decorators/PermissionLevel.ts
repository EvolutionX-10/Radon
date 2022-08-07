import type { RadonCommand } from '#lib/structures';
import { isAdmin, isGuildOwner, isModerator, isOwner } from '#lib/utility';
import { createFunctionPrecondition } from '@sapphire/decorators';
import { UserError } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';

export const PermissionLevel = (level: PermissionLevel): MethodDecorator => {
	return createFunctionPrecondition(async (interaction: RadonCommand.ChatInputCommandInteraction) => {
		const adminRoles = (await interaction.guild!.settings?.roles.admins) ?? [];
		const modRoles = (await interaction.guild!.settings?.roles.mods) ?? [];
		const admin =
			isAdmin(interaction.member as GuildMember) || (interaction.member as GuildMember).roles.cache.some((r) => adminRoles.includes(r.id));
		const mod =
			admin ||
			isModerator(interaction.member as GuildMember) ||
			(interaction.member as GuildMember).roles.cache.some((r) => modRoles.includes(r.id));
		const serverowner = isGuildOwner(interaction.member as GuildMember);
		if (isOwner(interaction.user)) return true;

		let error: string;
		switch (level) {
			case 'Administrator':
				error = `Only for Admins pal`;
				if (!admin) throw new UserError({ identifier: 'PermissionLevelError', message: error });
				return admin;
			case 'Moderator':
				error = `You ain't a mod bruh`;
				if (!mod) throw new UserError({ identifier: 'PermissionLevelError', message: error });
				return mod;
			case 'ServerOwner':
				error = `You ain't the server owner`;
				if (!serverowner) throw new UserError({ identifier: 'PermissionLevelError', message: error });
				return serverowner;
			case 'Everyone':
				return true;
		}
	});
};

export type PermissionLevel = 'Administrator' | 'Moderator' | 'ServerOwner' | 'Everyone';
