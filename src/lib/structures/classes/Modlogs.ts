import { guildSettingsDB } from '#models';
import type { Guild, MessageEmbed } from 'discord.js';

export class Modlogs {
	constructor(private readonly guild: Guild) {
		this.guild = guild;
	}
	public async modLogs_exist() {
		const data = await guildSettingsDB.findById(this.guild.id);
		if (data && data.modLogChannel) return data.modLogChannel;
		else return null;
	}
	public async sendModLog(embed: MessageEmbed) {
		const data = await guildSettingsDB.findById(this.guild.id);
		if (data && data.modLogChannel) {
			const modLogChannel = await this.guild.channels.fetch(data.modLogChannel);
			if (
				modLogChannel &&
				modLogChannel.type === 'GUILD_TEXT' &&
				modLogChannel
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					.permissionsFor(this.guild.me!)
					.has('SEND_MESSAGES')
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
