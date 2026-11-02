import { Emojis } from '#constants';
import { RadonEvents } from '#lib/types';
import { ClaimResult } from '#lib/utility';
import { maskMemberCode } from '../../lib/redemption/service.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.CodeClaim
})
export class UserListener extends Listener {
	public override async run(data: CodeClaimData) {
		const channel =
			this.container.client.channels.cache.get('1458829851711770891') ?? (await this.container.client.channels.fetch('1458829851711770891'));

		if (!channel || channel.type !== ChannelType.GuildText) return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook?.token) return;

		const content = `## \`${data.userTag}\` ${data.success ? 'claimed' : 'tried to claim'} code \`${data.code}\`\n> Message: ${data.message}\n\`\`\`json\n${JSON.stringify({ game: data.game ?? 'sololv', status: data.status, elapsedTime: data.elapsedTime })}\n\`\`\`\n - PID: \`${maskMemberCode(data.memberCode)}\`\n - Result: ${data.success ? `Successful ${Emojis.Confirm}` : `Failed ${Emojis.Cross}`}\n - Guild: \`${data.guild}\` (\`${data.guildId}\`)\n - Channel: \`#${data.channel}\` [<#${data.channelId}>] (\`${data.channelId}\`)\n - Time Taken: ⏱ ${data.elapsedTime}`;

		return webhook.send({
			username: data.userTag,
			avatarURL: data.avatarURL,
			content,
			allowedMentions: { parse: [] }
		});
	}
}

interface CodeClaimData extends ClaimResult {
	game?: string;
	userTag: string;
	avatarURL: string;
	guild: string;
	guildId: string;
	channel: string;
	channelId: string;
}
