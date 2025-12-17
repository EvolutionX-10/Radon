import { Emojis } from '#constants';
import { RadonEvents } from '#lib/types';
import { ClaimResult } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.CodeClaim
})
export class UserListener extends Listener {
	public override async run(data: CodeClaimData) {
		const channel =
			this.container.client.channels.cache.get('1441261253149331677') ?? (await this.container.client.channels.fetch('1441261253149331677'));

		if (!channel || channel.type !== ChannelType.GuildText) return;
		const webhook = (await channel.fetchWebhooks()).first();
		if (!webhook || !webhook?.token) return;

		const content = `## \`${data.userTag}\` ${data.success ? 'claimed' : 'tried to claim'} coupon code \`${data.code}\`\n> Message: ${data.message}\n\`\`\`json\n${JSON.stringify(data.apiResponse, null, 2)}\n\`\`\`\n - PID: \`${data.memberCode}\`\n - Result: ${data.success ? `Successful ${Emojis.Confirm}` : `Failed ${Emojis.Cross}`}\n - Time Taken: ⏱ ${data.elapsedTime}`;

		return webhook.send({
			username: data.userTag,
			avatarURL: data.avatarURL,
			content
		});
	}
}

interface CodeClaimData extends ClaimResult {
	userTag: string;
	avatarURL: string;
}
