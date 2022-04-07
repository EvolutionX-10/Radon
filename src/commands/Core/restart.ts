import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
@ApplyOptions<RadonCommand.Options>({
	description: `Restarts the bot.`,
	permissionLevel: PermissionLevels.BotOwner,
	flags: ['kill']
})
export class UserCommand extends RadonCommand {
	public async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		if (process.env.NODE_ENV === 'production') return;
		if (args.getFlags('kill')) {
			await message.react('💀');
			process.exit(0);
		}
		await message.react('🔄');
		setTimeout(function () {
			// Listen for the 'exit' event.
			// This is emitted when our app exits.
			process.on('exit', function () {
				//  Resolve the `child_process` module, and `spawn`
				//  a new process.
				//  The `child_process` module lets us
				//  access OS functionalities by running any bash command.`.
				container.logger.info('Restarting...');
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				require('child_process').spawn(process.argv.shift(), process.argv, {
					cwd: process.cwd(),
					detached: true,
					stdio: 'inherit'
				});
			});
			process.exit(0);
		}, 1000);
	}
}
