import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { UserCommand as about } from './about.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Provides some stats about me',
	permissionLevel: PermissionLevels.Everyone
})
export class UserCommand extends RadonCommand {
	public override messageRun(message: RadonCommand.Message) {
		return message.channel.send({
			embeds: [about.prototype.buildEmbed()]
		});
	}
}
