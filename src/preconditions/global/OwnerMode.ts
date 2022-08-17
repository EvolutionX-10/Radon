import { Owners } from '#constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuInteraction, Message } from 'discord.js';

@ApplyOptions<Precondition.Options>({
	position: 1
})
export class UserPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		return this.inOwnerMode(message.author.id);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		return this.inOwnerMode(interaction.user.id);
	}

	public override async contextMenuRun(interaction: ContextMenuInteraction) {
		return this.inOwnerMode(interaction.user.id);
	}

	private async inOwnerMode(id: string) {
		let mode = false;
		if (this.container.client.user?.presence.status === 'invisible') mode = true;

		if (!mode) return this.ok();

		return Owners.includes(id)
			? this.ok()
			: this.error({
					message: `I am in bot owner mode`,
					context: { silent: true }
			  });
	}
}
