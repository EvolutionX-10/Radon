import { Confirmation, RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	aliases: ['slashies'],
	permissionLevel: PermissionLevels.BotOwner,
	hidden: true,
	guarded: true,
	flags: ['user', 'm', 'msg', 'message']
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		const subcmd = await args.pick('string').catch(() => null);

		switch (subcmd) {
			case 'del':
			case 'delete':
				return this.delete(message, args);
			default:
				return this.default(message, args);
		}
	}

	private async default(message: RadonCommand.Message, args: RadonCommand.Args) {
		if (!message.guild) return;

		let filtered: ApplicationCommandType;
		let cmds: string;

		switch (true) {
			case args.getFlags('user'):
				filtered = ApplicationCommandType.User;
				cmds = 'User Context Menu Commands';
				break;
			case args.getFlags('msg', 'message', 'm'):
				filtered = ApplicationCommandType.Message;
				cmds = 'Message Context Menu Commands';
				break;
			default:
				filtered = ApplicationCommandType.ChatInput;
				cmds = 'Slashies';
		}

		const global = (await this.container.client.application?.commands.fetch())?.filter((c) => c.type === filtered);
		const guild = (await message.guild.commands.fetch()).filter((c) => c.type === filtered);

		let content = `**Global** ${cmds}\n\n`;

		if (global) {
			for (const cmd of global.values()) {
				if (filtered === ApplicationCommandType.ChatInput) content += `</${cmd.name}:${cmd.id}> *(${cmd.id})*\n`;
				else content += `${cmd.name} *(${cmd.id})*\n`;
			}
		}

		content += `\n**Guild** ${cmds} \`[${message.guild.name}]\`\n\n`;

		if (guild) {
			for (const cmd of guild.values()) {
				if (filtered === ApplicationCommandType.ChatInput) content += `</${cmd.name}:${cmd.id}> *(${cmd.id})*\n`;
				else content += `${cmd.name} *(${cmd.id})*\n`;
			}
		}

		// TODO Paginate it
		return send(message, content);
	}

	private async delete(message: RadonCommand.Message, args: RadonCommand.Args) {
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
				return i.editReply(`Deleted ${cmd.name} *(${cmd.id})*`);
			},
			onCancel: ({ i }) => {
				return i.editReply(`Cancelled deletion of ${cmd.name} *(${cmd.id})*`);
			},
			content: `Are you sure you want to delete ${cmd.name} *(${cmd.id})*?`
		}).run(message);
	}
}
