import { PermissionsPrecondition } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { isModerator } from '#lib/utility';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
    public async handle(
        message: GuildMessage
    ): PermissionsPrecondition.AsyncResult {
        return isModerator(message.member)
            ? this.ok()
            : this.error({
                  identifier: `Not a mod`,
                  message: `You aint a mod bruh`,
              });
    }
}
