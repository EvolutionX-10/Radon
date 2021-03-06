import { RadonCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
@ApplyOptions<RadonCommand.Options>({
	aliases: ['s']
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		const num = await args.pick('number').catch(() => null);
		if (!num) return;
		for (let i = 0; i < num; i++) {
			await this.container.utils.wait(500);
			await message.channel.send(`${i + 1}`);
		}
	}
}
