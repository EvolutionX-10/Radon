import { blacklistDB } from '#models';
import { ApplyOptions } from '@sapphire/decorators';
import { AllFlowsPrecondition, Precondition } from '@sapphire/framework';
@ApplyOptions<Precondition.Options>({
    position: 2,
})
export class UserPrecondition extends Precondition {
    public async messageRun(
        ...[message]: Parameters<AllFlowsPrecondition['messageRun']>
    ) {
        return this.isBlacklisted(message.guildId ?? undefined);
    }
    public async chatInputRun(
        ...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>
    ) {
        return this.isBlacklisted(interaction.guildId ?? undefined);
    }
    public async contextMenuRun(
        ...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>
    ) {
        return this.isBlacklisted(interaction.guildId ?? undefined);
    }
    private async isBlacklisted(id?: string) {
        if (!id) return this.ok();
        const blUsers = await blacklistDB.findById(id);
        if (blUsers) {
            return this.error({
                context: { silent: true },
                message: `You are blacklisted!`,
            });
        } else return this.ok();
    }
}
