import type { PrismaClient } from '@prisma/client';
import type { Embed } from './Embed.js';
import { ButtonBuilder, ButtonStyle, ChannelType, Guild } from 'discord.js';
import { Button } from './Button.js';
import { Row } from './Row.js';

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

	public async sendModLog(embed: Embed, url?: string) {
		const data = await this.prisma.guildSettings.findUnique({ where: { id: this.guild.id } });

		if (data && data.modLogChannel) {
			const modLogChannel = await this.guild.channels.fetch(data.modLogChannel);
			if (
				modLogChannel &&
				modLogChannel.type === ChannelType.GuildText &&
				modLogChannel.permissionsFor(this.guild.members.me!).has('SendMessages')
			) {
				const row = new Row<ButtonBuilder>()._components([]);

				if (url) {
					const linkButton = new Button() //
						._style(ButtonStyle.Link)
						._label('Take me there')
						._url(url);
					row._components([linkButton]);
				}

				const sent = await modLogChannel.send({ embeds: [embed], components: url ? [row] : undefined });

				const editButton = new Button() //
					._style(ButtonStyle.Secondary)
					._label('Edit Reason')
					._customId(`edit_reason:${sent.id}`);
				row.addComponents(editButton);

				await sent
					.edit({
						embeds: [embed.setFooter({ text: `ID: ${sent.id}` })],
						components: [row]
					})
					.catch(() => null);
				return sent;
			}
		}
		return null;
	}
}
