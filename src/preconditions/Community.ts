import { Precondition, type AllFlowsPrecondition, type AsyncPreconditionResult } from '@sapphire/framework';
import type { Guild } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override async messageRun(...[message]: Parameters<AllFlowsPrecondition['messageRun']>) {
		return this.isCommunity(message.guild!);
	}

	public override async chatInputRun(...[interaction]: Parameters<AllFlowsPrecondition['chatInputRun']>) {
		return this.isCommunity(interaction.guild!);
	}

	public override async contextMenuRun(...[interaction]: Parameters<AllFlowsPrecondition['contextMenuRun']>) {
		return this.isCommunity(interaction.guild!);
	}

	private async isCommunity(guild: Guild): AsyncPreconditionResult {
		return guild.features.includes('COMMUNITY')
			? this.ok()
			: this.error({ message: "This server doesn't look like community server, this command is reserved for community servers!" });
	}
}
