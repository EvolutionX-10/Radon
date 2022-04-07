import { PermissionsPrecondition } from '#lib/structures';
import { isAdmin } from '#lib/utility';
import type { GuildMessage } from '#lib/types';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
	public async handle(message: GuildMessage): PermissionsPrecondition.AsyncResult {
		const roles = (await message.guild.settings?.roles.admins) ?? [];
		return isAdmin(message.member)
			? this.ok()
			: message.member.roles.cache.some((r) => roles.includes(r.id))
			? this.ok()
			: this.error({
					identifier: `Error`,
					message: `Only for Admins pal`
			  });
	}
}
