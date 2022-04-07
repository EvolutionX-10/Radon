import { vars } from '#vars';
import { AllFlowsPrecondition, AsyncPreconditionResult, Precondition } from '@sapphire/framework';

export class UserPrecondition extends Precondition {
	public override async messageRun(...[message]: Parameters<AllFlowsPrecondition['messageRun']>) {
		return this.isBotOwner(message.author.id);
	}
	public override async chatInputRun(...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>) {
		return this.isBotOwner(interaction.user.id);
	}
	public override async contextMenuRun(...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>) {
		return this.isBotOwner(interaction.user.id);
	}
	private async isBotOwner(id: string): AsyncPreconditionResult {
		return vars.owners.includes(id) ? this.ok() : this.error({ context: { silent: true } });
	}
}
