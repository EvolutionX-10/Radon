import type { RadonCommand } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Identifiers, UserError, MessageCommandDeniedPayload, ListenerOptions, Events, Args } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import hd from 'humanize-duration';
@ApplyOptions<ListenerOptions>({
	event: Events.MessageCommandDenied
})
export class UserListener extends Listener {
	public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
		if (Reflect.get(Object(error.context), 'silent')) return;
		if (error.identifier === Identifiers.PreconditionCooldown) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const time = (error.context as any).remaining;
			const msg = `Take a breathe! It can be used again in ${hd(Math.ceil(time), { round: true })}.`;
			message.author.spam += 1;
			if (message.author.spam === 5) {
				return send(message, {
					content: `<@${message.author.id}> stop spamming commands else you'll be blacklisted!`,
					allowedMentions: {
						parse: ['users']
					}
				});
			}
			if (message.author.spam === 7) {
				message.author.spam = 0;
				const cmd = this.container.stores.get('commands').get('blacklist');
				const args = await cmd?.messagePreParse(message, `${message.author.id} [AUTO] Spam --silent`, {
					commandName: 'blacklist',
					commandPrefix: '',
					prefix: ''
				});
				await (cmd as RadonCommand).messageRun(message, args as Args, {});
				return send(message, {
					content: `<@${message.author.id}> you're blacklisted for spamming commands!`,
					allowedMentions: {
						parse: ['users']
					}
				});
			}
			return send(message, msg);
		}
		return send(message, error.message);
	}
}
declare module 'discord.js' {
	interface User {
		spam: number;
	}
}
