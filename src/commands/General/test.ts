import { RadonCommand, Confirmation } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<RadonCommand.Options>({
	description: 'Test the confirmation command'
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message) {
		await new Confirmation({
			onConfirm: ({ i, msg }) => {
				return i.update({ embeds: [msg.embeds[0].setDescription('Confirmed!')] });
			},
			onCancel: ({ i, msg }) => {
				return i.update({ embeds: [msg.embeds[0].setDescription(`Cancelled!`)] });
			}
		}).run(message);
	}
}
