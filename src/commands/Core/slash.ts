import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import type { MessageCommand } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
@ApplyOptions<RadonCommand.Options>({
	aliases: ['slashies'],
	permissionLevel: PermissionLevels.BotOwner,
	hidden: true,
	guarded: true,
	runIn: 'GUILD_ANY',
	subCommands: [
		{
			input: 'default',
			default: true
		},
		{
			input: 'del',
			output: 'delete'
		}
	]
})
export class UserCommand extends RadonCommand {
	public async default(...[message]: Parameters<MessageCommand['messageRun']>) {
		if (!message.guild) return;
		const global = await this.container.client.application?.commands.fetch();
		const guild = await message.guild.commands.fetch();
		let content = ``;
		content += `**Global** Slashies\n\n`;
		global?.forEach((cmd) => {
			content += `${cmd.name} (${cmd.id})\n`;
		});
		content += `\n**Guild** Slashies \`[${message.guild.name}]\`\n\n`;
		guild?.forEach((cmd) => {
			content += `${cmd.name} (${cmd.id})\n`;
		});
		return send(message, content);
	}
	public async delete(message: RadonCommand.Message, args: RadonCommand.Args) {
		if (!message.guild) return;
		const global = await this.container.client.application?.commands.fetch();
		const guild = await message.guild.commands.fetch();
		const cmd_name = await args.pick('string').catch(() => null);
		if (!cmd_name) return;
		const cmd = global?.find((c) => c.name === cmd_name) || guild?.find((c) => c.name === cmd_name);
		if (!cmd) return;
		await cmd.delete();
		await message.channel.send({
			content: `Successfully deleted ${cmd.name} (${cmd.id})`
		});
	}
}
