import { container } from '@sapphire/framework';
import type { TextChannel, MessageEmbed, Message } from 'discord.js';

export async function error(message: string | MessageEmbed): Promise<Message<boolean>> {
	const client = container.client;
	const channelId = '927974957458288720';
	const channel = client.channels.cache.get(channelId) as TextChannel;
	if (typeof message == 'string') {
		return channel.send({
			content: message
		});
	} else return channel.send({ embeds: [message] });
}
