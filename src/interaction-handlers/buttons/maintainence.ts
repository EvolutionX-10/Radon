import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { ButtonInteraction, Message } from 'discord.js';
@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
		if (!vars.owners.includes(interaction.user.id)) return this.none();
		if (isNullish(result.ownerMode)) return;
		this.container.client.user?.setPresence({
			status: result.ownerMode ? 'dnd' : 'invisible',
			activities: [
				{
					name: result.ownerMode ? 'for Rule Breakers' : 'Evo',
					type: result.ownerMode ? 'WATCHING' : 'LISTENING'
				}
			]
		});
		const { msg } = result;
		return msg?.edit({
			embeds: [msg.embeds[0].setDescription(result.description)]
		});
	}

	public override async parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'radon-maintenance') return this.none();
		await interaction.deferUpdate({ fetchReply: true });
		const ownerMode = Boolean(Number(await this.container.db.get('ownerMode'))!);

		ownerMode ? await this.container.db.set('ownerMode', 0) : await this.container.db.set('ownerMode', 1);
		const description = ownerMode ? '```\nStatus: Disabled\n```' : '```\nStatus: Enabled\n```';
		const msg = interaction.message as Message;
		return this.some({ ownerMode, msg, description });
	}
}
