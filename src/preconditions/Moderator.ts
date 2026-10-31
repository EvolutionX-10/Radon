import { PermissionsPrecondition } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { isModerator } from '#lib/utility';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
	public override async handle(message: GuildMessage<boolean>): PermissionsPrecondition.AsyncResult {
		const roles = await message.guild?.settings?.roles.snapshot();
		const allowed = isModerator(message.member, [...(roles?.admins ?? []), ...(roles?.mods ?? [])]);

		return allowed
			? this.ok()
			: this.error({
					identifier: `Not a mod`,
					message: `You ain't a mod bruh`
				});
	}
}
