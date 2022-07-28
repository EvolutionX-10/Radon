import { ApplyOptions } from '@sapphire/decorators';
import { AllFlowsPrecondition, Precondition } from '@sapphire/framework';
@ApplyOptions<Precondition.Options>({
	position: 2
})
export class UserPrecondition extends Precondition {
	public override async messageRun(...[message]: Parameters<AllFlowsPrecondition['messageRun']>) {
		return this.isBlacklisted(message.guildId ?? undefined);
	}

	public override async chatInputRun(...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>) {
		return this.isBlacklisted(interaction.guildId ?? undefined);
	}

	public override async contextMenuRun(...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>) {
		return this.isBlacklisted(interaction.guildId ?? undefined);
	}

	private async isBlacklisted(id?: string) {
		if (!id) return this.ok();
		const blacklisted = await this.container.prisma.blacklist.findUnique({
			where: {
				id
			}
		});

		return blacklisted ? this.error({ context: { silent: true } }) : this.ok();
	}
}
