import { PermissionsPrecondition } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { isAdmin, isModerator } from '#lib/utility';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
	public override async handle(message: GuildMessage): PermissionsPrecondition.AsyncResult {
		const modRoles = (await message.guild.settings?.roles.mods) ?? [];
		const adminRoles = (await message.guild.settings?.roles.admins) ?? [];
		const allowed =
			isAdmin(message.member) ||
			isModerator(message.member) ||
			message.member.roles.cache.some((r) => adminRoles.concat(modRoles).includes(r.id));

		return allowed
			? this.ok()
			: this.error({
					identifier: `Not a mod`,
					message: `You ain't a mod bruh`
				});
	}
}
