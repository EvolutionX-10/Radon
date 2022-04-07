import { modesDB } from '#models';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { ButtonInteraction, Message } from 'discord.js';
@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction, result: InteractionHandler.ParseResult<this>) {
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
		const msg = result.msg;
		return msg?.edit({
			embeds: [msg.embeds[0].setDescription(result.description)]
		});
	}
	public async parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'radon-maintenance') return this.none();
		await interaction.deferUpdate({ fetchReply: true });
		const id = '61cf428394b75db75b5dafb4';
		const mode = await modesDB.findById(id);
		const ownerMode = mode?.ownerMode as boolean;
		if (ownerMode) {
			await modesDB.findByIdAndUpdate(id, {
				ownerMode: false
			});
		} else {
			await modesDB.findByIdAndUpdate(id, {
				ownerMode: true
			});
		}
		const description = ownerMode ? '```\n' + 'Status: Disabled' + '\n' + '```' : '```\n' + 'Status: Enabled' + '\n' + '```';
		const msg = interaction.message as Message;
		return this.some({ ownerMode, msg, description });
	}
}
