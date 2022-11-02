import { Color, voteRow } from '#constants';
import { Embed } from '#lib/structures';
import { RadonEvents } from '#lib/types';
import { isOwner } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';
import { fetch } from 'undici';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ChatInputCommandFinish
})
export class UserListener extends Listener {
	public override async run(interaction: CommandInteraction) {
		if (isOwner(interaction.user)) return;
		const isvoted = await this.hasVoted(interaction);
		if (!isvoted && chance(10) && interaction.commandName !== 'about') await this.addVoteMsg(interaction);
	}

	private async hasVoted(interaction: CommandInteraction) {
		const res = await fetch(`https://top.gg/api/bots/944833303226236989/check?userId=${interaction.user.id}`, {
			headers: {
				Authorization: process.env.TOP_BOT_TOKEN!
			}
		});
		const data = (await res.json()) as vote;

		return Boolean(data.voted);
	}

	private async addVoteMsg(interaction: CommandInteraction) {
		const embed = new Embed()
			._color(Color.General)
			._title('Thank you for using me')
			._description('If you liked the experience, please consider voting for me as it really helps my developer!\n\n Click the buttons below')
			._timestamp()
			._footer({
				text: 'Thank you <3',
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			._thumbnail(this.container.client.user?.displayAvatarURL() ?? '');

		await interaction.followUp({
			embeds: [embed],
			components: [voteRow],
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
