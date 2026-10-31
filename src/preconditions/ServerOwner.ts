import { PermissionsPrecondition } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import type { CommandInteraction } from 'discord.js';

export class UserPermissionsPrecondition extends PermissionsPrecondition {
	public handle(message: GuildMessage<true> | CommandInteraction<'cached'>): PermissionsPrecondition.Result {
		const user = 'author' in message ? message.author : message.user;
		return user.id === message.guild.ownerId
			? this.ok()
			: this.error({
					identifier: `GuildOwner`,
					message: `Only owner of this server can do!`
				});
	}
}
