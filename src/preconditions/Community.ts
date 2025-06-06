import type { GuildContextMenuInteraction, GuildMessage } from '#lib/types';
import { Precondition, type AsyncPreconditionResult } from '@sapphire/framework';
import type { ChatInputCommandInteraction, Guild } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override async messageRun(message: GuildMessage<boolean>) {
		if (!message.guild) return this.error({ message: 'This command can only be used in a community server.' });
		return this.isCommunity(message.guild);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction<'cached'>) {
		return this.isCommunity(interaction.guild);
	}

	public override async contextMenuRun(interaction: GuildContextMenuInteraction) {
		return this.isCommunity(interaction.guild);
	}

	private async isCommunity(guild: Guild): AsyncPreconditionResult {
		return guild.features.includes('COMMUNITY')
			? this.ok()
			: this.error({ message: "This server doesn't look like community server, this command is reserved for community servers!" });
	}
}
