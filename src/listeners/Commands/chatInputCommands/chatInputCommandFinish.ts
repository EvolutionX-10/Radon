import { color, isOwner } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import axios from 'axios';
import { CommandInteraction, MessageEmbed } from 'discord.js';
@ApplyOptions<Listener.Options>({
	event: Events.ChatInputCommandFinish
})
export class UserListener extends Listener {
	public override async run(interaction: CommandInteraction) {
		if (isOwner(interaction.user)) return;
		const isvoted = await this.hasVoted(interaction);
		if (!isvoted && chance(40)) await this.addVoteMsg(interaction);
	}
	private async hasVoted(interaction: CommandInteraction) {
		const { data }: { data: vote } = await axios({
			url: `https://top.gg/api/bots/944833303226236989/check?userId=${interaction.user.id}`,
			method: 'GET',
			headers: {
				Authorization: process.env.TOP_BOT_TOKEN as string
			}
		});
		if (data.voted === 0) return false;
		else return true;
	}
	private async addVoteMsg(interaction: CommandInteraction) {
		const embed = new MessageEmbed()
			.setColor(color.General)
			.setTitle('Thank you for using me')
			.setDescription(
				'If you liked the experience, please consider voting for me as it really helps the developer!' +
					'\n\n' +
					'You can vote by clicking [here](https://top.gg/bot/944833303226236989/vote) for top.gg\n' +
					'and [here](https://voidbots.net/bot/944833303226236989/vote) for void bots' +
					' or by clicking the buttons below'
			)
			.setTimestamp()
			.setFooter({
				text: 'Thank you <3',
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setThumbnail(this.container.client.user?.displayAvatarURL() ?? '');

		await interaction.followUp({
			embeds: [embed],
			components: [
				{
					type: 'ACTION_ROW',
					components: [
						{
							type: 'BUTTON',
							label: 'Vote for me on Top.gg!',
							url: `https://top.gg/bot/944833303226236989/vote`,
							style: 'LINK'
						},
						{
							type: 'BUTTON',
							label: 'Vote for me on Void Bots!',
							url: `https://voidbots.net/bot/944833303226236989/vote`,
							style: 'LINK'
						}
					]
				}
			],
			ephemeral: chance(90)
		});
	}
}

interface vote {
	voted: 0 | 1;
}

function chance(percent: number) {
	return Math.random() * 100 < percent;
}
