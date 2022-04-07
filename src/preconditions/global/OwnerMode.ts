import { modesDB } from '#models';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { AllFlowsPrecondition, Precondition } from '@sapphire/framework';

@ApplyOptions<Precondition.Options>({
	position: 1
})
export class UserPrecondition extends Precondition {
	public async messageRun(...[message]: Parameters<AllFlowsPrecondition['messageRun']>) {
		return this.inOwnerMode(message.author.id);
	}
	public async chatInputRun(...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>) {
		return this.inOwnerMode(interaction.user.id);
	}
	public async contextMenuRun(...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>) {
		return this.inOwnerMode(interaction.user.id);
	}
	private async inOwnerMode(id: string) {
		const database = await modesDB.findById('61cf428394b75db75b5dafb4');
		const mode = database?.ownerMode;
		if (!mode) return this.ok();
		else
			return vars.owners.includes(id)
				? this.ok()
				: this.error({
						message: `I am in bot owner mode`,
						context: { silent: true }
				  });
	}
}
