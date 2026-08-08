import type { GuildContextMenuInteraction, GuildMessage } from '#lib/types';
import { Owners } from '#constants';
import { type AsyncPreconditionResult, Precondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override async messageRun(message: GuildMessage<boolean>) {
		return this.isBotOwner(message.author.id);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction<'cached'>) {
		return this.isBotOwner(interaction.user.id);
	}

	public override async contextMenuRun(interaction: GuildContextMenuInteraction) {
		return this.isBotOwner(interaction.user.id);
	}

	private async isBotOwner(id: string): AsyncPreconditionResult {
		return Owners.includes(id)
			? this.ok()
			: this.error({
					message:
						'Special command activated...\n<:sussy:1458685275512377377> But wait, you are not special enough....\nCommand failed <:pepe_exit:1313232039012597780>'
				});
	}
}
