import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { subtext } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Configure special settings',
	guarded: true,
	aliases: ['c'],
	flags: ['disable', 'enable'],
	permissionLevel: PermissionLevels.BotOwner
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		const serverId = await args.pick('string').catch(() => null);
		if (!serverId) return;
		const disable = args.getFlags('disable');

		const in_server = await message.client.guilds.fetch(serverId).catch(() => null);

		let extra = in_server ? '' : `\n${subtext('(Note: The bot is not in this server)')}`;
		let config = await this.container.prisma.specialConfig.findUnique({
			where: { id: serverId }
		});

		// if config exists and disable is true, delete it
		if (config && disable) {
			await this.container.prisma.specialConfig.delete({
				where: { id: serverId }
			});
			return send(message, `Claim disabled for server ID: ${serverId}${extra}`);
		}

		if (!config && !disable) {
			await this.container.prisma.specialConfig.create({
				data: { id: serverId, claimEnabled: true }
			});
			return send(message, `Claim enabled for server ID: ${serverId}${extra}`);
		}

		if (config && !disable) {
			return send(message, `Claim is already enabled for server ID: ${serverId}${extra}`);
		}

		return send(message, `Claim is already disabled for server ID: ${serverId}${extra}`);
	}
}
