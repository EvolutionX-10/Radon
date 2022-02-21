import { PermissionsPrecondition } from '#lib/structures';
import { isAdmin } from '#lib/utility';
import type { GuildMessage } from '#lib/types';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
    public async handle(
        message: GuildMessage
    ): PermissionsPrecondition.AsyncResult {
        return isAdmin(message.member)
            ? this.ok()
            : this.error({
                  identifier: `Error`,
                  message: `Only for Admins pal`,
              });
    }
}
