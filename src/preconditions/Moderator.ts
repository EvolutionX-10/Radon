import { PermissionsPrecondition } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { isModerator } from '#lib/utility';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
	public async handle(message: GuildMessage): PermissionsPrecondition.AsyncResult {
		const roles = (await message.guild.settings?.roles.mods) ?? [];
		return isModerator(message.member)
			? this.ok()
			: message.member.roles.cache.some((r) => roles.includes(r.id))
			? this.ok()
			: this.error({
					identifier: `Not a mod`,
					message: `You ain't a mod bruh`
			  });
	}
}
