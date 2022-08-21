import { ApplyOptions, RequiresClientPermissions, RequiresDMContext, RequiresGuildContext } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { Message, MessageEmbed } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	aliases: ['cwd'],
	description: 'A basic message command with some subcommands',
	subcommands: [
		{
			name: 'add',
			messageRun: 'add'
		},
		{
			name: 'create',
			messageRun: 'add'
		},
		{
			name: 'remove',
			messageRun: 'remove'
		},
		{
			name: 'reset',
			messageRun: 'reset'
		},
		{
			name: 'show',
			messageRun: 'show'
		}
	]
})
export class UserCommand extends Subcommand {
	// Anyone should be able to view the result, but not modify
	public async show(message: Message) {
		return send(message, 'Showing!');
	}

	@RequiresClientPermissions('EMBED_LINKS') // This sub-command requires the bot to have EMBED_LINKS permission because it sends a MessageEmbed
	public async add(message: Message) {
		const embed = new MessageEmbed() //
			.setColor('#3986E4')
			.setDescription('Added!')
			.setTitle('Configuration Log')
			.setTimestamp();

		return send(message, { embeds: [embed] });
	}

	@RequiresGuildContext((message: Message) => send(message, 'This sub-command can only be used in servers'))
	public async remove(message: Message) {
		return send(message, 'Removing!');
	}

	@RequiresDMContext((message: Message) => send(message, 'This sub-command can only be used in DMs'))
	public async reset(message: Message) {
		return send(message, 'Resetting!');
	}
}
