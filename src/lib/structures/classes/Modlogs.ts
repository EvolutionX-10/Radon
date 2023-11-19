import type { PrismaClient } from '@prisma/client';
import type { Embed } from './Embed.js';
import { ChannelType, Guild } from 'discord.js';

export class Modlogs {
	public constructor(
		private readonly guild: Guild,
		private readonly prisma: PrismaClient
	) {
		this.guild = guild;
	}

	public async modLogs_exist() {
		const data = await this.prisma.guildSettings.findUnique({ where: { id: this.guild.id } });

		return data?.modLogChannel;
	}

	public async sendModLog(embed: Embed) {
		const data = await this.prisma.guildSettings.findUnique({ where: { id: this.guild.id } });

		if (data && data.modLogChannel) {
			const modLogChannel = await this.guild.channels.fetch(data.modLogChannel);
			if (
				modLogChannel &&
				modLogChannel.type === ChannelType.GuildText &&
				modLogChannel.permissionsFor(this.guild.members.me!).has('SendMessages')
			) {
				const sent = await modLogChannel.send({ embeds: [embed] });
				await sent
					.edit({
						embeds: [embed.setFooter({ text: `ID: ${sent.id}` })]
					})
					.catch(() => null);
				return sent;
			}
		}
		return null;
	}
}
