import { ApplyOptions } from '@sapphire/decorators';
import { AllFlowsPrecondition, Precondition } from '@sapphire/framework';
import { Owners } from '#constants';
@ApplyOptions<Precondition.Options>({
	position: 2
})
export class UserPrecondition extends Precondition {
	public override async messageRun(...[message]: Parameters<AllFlowsPrecondition['messageRun']>) {
		return this.isBlacklisted(message.guildId, message.author.id);
	}

	public override async chatInputRun(...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>) {
		return this.isBlacklisted(interaction.guildId, interaction.user.id);
	}

	public override async contextMenuRun(...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>) {
		return this.isBlacklisted(interaction.guildId, interaction.user.id);
	}

	private async isBlacklisted(id: string | null, userId: string) {
		if (!Owners.includes(userId)) {
			const user = await this.container.prisma.bugReporter.findUnique({ where: { id: userId } });
			if (user?.banned) return this.error({ message: 'You are banned from using Radon.' });
		}
		if (!id) return this.ok();
		const blacklisted = await this.container.prisma.blacklist.findUnique({
			where: {
				id
			}
		});

		return blacklisted ? this.error({ context: { silent: true } }) : this.ok();
	}
}
