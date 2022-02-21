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
        return await this.isBlacklisted(message.author.id);
    }
    public async chatInputRun(
        ...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>
    ) {
        return await this.isBlacklisted(interaction.user.id);
    }
    public async contextMenuRun(
        ...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>
    ) {
        return await this.isBlacklisted(interaction.user.id);
    }
    private async isBlacklisted(id: string) {
        const blUsers = await blacklistDB.findById(id);
        if (blUsers) {
            return this.error({
                context: { silent: true },
                message: `You are blacklisted!`,
            });
        } else return this.ok();
    }
}
