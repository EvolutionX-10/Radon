import type { GuildContextMenuInteraction, GuildInteraction, GuildMessage } from '#lib/types';
import { Owners } from '#constants';
import { AsyncPreconditionResult, Precondition } from '@sapphire/framework';

export class UserPrecondition extends Precondition {
	public override async messageRun(message: GuildMessage) {
		return this.isBotOwner(message.author.id);
	}

	public override async chatInputRun(interaction: GuildInteraction) {
		return this.isBotOwner(interaction.user.id);
	}

	public override async contextMenuRun(interaction: GuildContextMenuInteraction) {
		return this.isBotOwner(interaction.user.id);
	}

	private async isBotOwner(id: string): AsyncPreconditionResult {
		return Owners.includes(id) ? this.ok() : this.error({ context: { silent: true } });
	}
}
