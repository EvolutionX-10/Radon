import type { GuildContextMenuInteraction, GuildInteraction, GuildMessage } from '#lib/types';
import { Precondition, AsyncPreconditionResult } from '@sapphire/framework';
import type { Guild } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override async messageRun(message: GuildMessage) {
		return this.isCommunity(message.guild);
	}

	public override async chatInputRun(interaction: GuildInteraction) {
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
