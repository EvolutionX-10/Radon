import { RadonCommand, Confirmation } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<RadonCommand.Options>({
	description: 'Test the confirmation command'
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message) {
		await new Confirmation({
			onConfirm: async ({ i }) => {
				await i.update({ content: 'Confirmed!', embeds: [] });
			},
			onCancel: async ({ i }) => {
				await i.update({ content: 'Cancelled!', embeds: [] });
			},
			time: 5000,
			color: 'GOLD'
		}).run(message);
	}
}
