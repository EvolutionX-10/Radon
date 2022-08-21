import { Confirmation } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import type { Args } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { Subcommand } from '@sapphire/plugin-subcommands';
import type { Message } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	aliases: ['slashies'],
	// permissionLevel: PermissionLevels.BotOwner,
	// hidden: true,
	// guarded: true,
	flags: true,
	subcommands: [
		{
			name: 'default',
			messageRun: 'default',
			default: true
		},
		{
			name: 'del',
			messageRun: 'delete'
		},
		{
			name: 'delete',
			messageRun: 'delete'
		}
	]
})
export class UserCommand extends Subcommand {
	public async default(message: Message, args: Args) {
		if (!message.guild) return;

		let filtered: string;
		let cmds: string;

		switch (true) {
			case args.getFlags('user'):
				filtered = 'USER';
				cmds = 'User Context Menu Commands';
				break;
			case args.getFlags('msg', 'message', 'm'):
				filtered = 'MESSAGE';
				cmds = 'Message Context Menu Commands';
				break;
			default:
				filtered = 'CHAT_INPUT';
				cmds = 'Slashies';
		}

		const global = (await this.container.client.application?.commands.fetch())?.filter((c) => c.type === filtered);
		const guild = (await message.guild.commands.fetch()).filter((c) => c.type === filtered);

		let content = `**Global** ${cmds}\n\n`;

		global?.forEach((cmd) => {
			content += `${cmd.name} *(${cmd.id})*\n`;
		});
		content += `\n**Guild** ${cmds} \`[${message.guild.name}]\`\n\n`;
		guild?.forEach((cmd) => {
			content += `${cmd.name} *(${cmd.id})*\n`;
		});

		// TODO Paginate it
		return send(message, content);
	}

	public async delete(message: Message, args: Args) {
		if (!message.guild) return;

		const global = await this.container.client.application?.commands.fetch();
		const guild = await message.guild.commands.fetch();

		const cmd_name = await args.pick('string').catch(() => null);
		if (!cmd_name) return;
		const cmd = global?.find((c) => c.name === cmd_name) || guild?.find((c) => c.name === cmd_name);
		if (!cmd) return;
		await new Confirmation({
			onConfirm: async ({ i }) => {
				await cmd.delete();
				return i.editReply(`Deleted ${cmd.name}`);
			},
			onCancel: ({ i }) => {
				return i.editReply(`Cancelled deletion of ${cmd.name} *(${cmd.id})*`);
			},
			content: `Are you sure you want to delete ${cmd.name} *(${cmd.id})*?`
		}).run(message);
	}
}
