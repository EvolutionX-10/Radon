import { Owners } from '#constants';
import { Embed } from '#lib/structures';
import type { RadonButtonInteraction } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { ActivityType } from 'discord.js';
@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override run(interaction: RadonButtonInteraction, result: InteractionHandler.ParseResult<this>) {
		if (!Owners.includes(interaction.user.id)) return this.none();
		if (isNullish(result.ownerMode)) return;

		interaction.client.user.setPresence({
			status: result.ownerMode ? 'online' : 'dnd',
			activities: [
				{
					name: result.ownerMode ? 'for Rule Breakers' : 'Evo',
					type: result.ownerMode ? ActivityType.Watching : ActivityType.Listening
				}
			]
		});

		return result.msg.edit({
			embeds: [new Embed(result.msg.embeds[0].data)._description(result.description)]
		});
	}

	public override async parse(interaction: RadonButtonInteraction) {
		if (interaction.customId !== 'radon-maintenance') return this.none();
		await interaction.deferUpdate({ fetchReply: true });

		const ownerMode = interaction.client.user.presence.status === 'dnd';

		const description = ownerMode ? '```\nStatus: Disabled\n```' : '```\nStatus: Enabled\n```';
		const msg = interaction.message;
		return this.some({ ownerMode, msg, description });
	}
}
