/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Stopwatch } from '@sapphire/stopwatch';
import { Type } from '@sapphire/type';
import { codeBlock, isThenable } from '@sapphire/utilities';
import type { Message } from 'discord.js';
import { inspect } from 'util';
import axios from 'axios';
@ApplyOptions<RadonCommand.Options>({
	aliases: ['ev'],
	quotes: [],
	permissionLevel: PermissionLevels.BotOwner,
	flags: true,
	options: true,
	description: 'Evaluate some code',
	guarded: true
})
export class UserCommand extends RadonCommand {
	public async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		const code = await args.rest('string');
		const { success, result, time, type } = await this.eval(message, code, {
			async: args.getFlags('async'),
			depth: Number(args.getOption('depth')) ?? 0,
			showHidden: args.getFlags('hidden', 'showHidden')
		}).catch((e: Error) => {
			return {
				success: false,
				result: e.message,
				time: '',
				type: 'SyntaxError'
			};
		});
		const footer = codeBlock('ts', type);
		if (args.getFlags('haste')) {
			const url = await this.getHaste(result).catch(() => undefined);
			if (url) {
				return send(message, `Here's the result: <${url}>\n\n${footer}\n${time}`);
			} else return send(message, `Failed to get haste url`);
		}
		if (args.getFlags('silent', 's')) {
			if (!success && result) {
				await message.react(vars.emojis.cross);
				return null;
			}
			await message.react(vars.emojis.confirm);
			return null;
		}

		if (result.length > 1900) {
			return send(message, {
				content: `Output was too long... sent the result as a file.\n\n${footer}`,
				files: [
					{
						attachment: Buffer.from(result),
						name: 'output.js'
					}
				]
			});
		}

		return send(message, `${codeBlock('ts', result)}\n${footer}\n${time}`);
	}
	private async eval(message: Message, code: string, flags: flags) {
		const stopwatch = new Stopwatch();
		if (code.includes('await')) flags.async = true;
		const ar = code.split(';');
		const last = ar.pop();
		if (flags.async) code = `(async () => {\n${ar.join(';\n')}\nreturn ${last?.trim() ?? 'void'}})();`;
		// @ts-ignore
		const msg = message,
			client = this.container.client,
			guild = message.guild,
			channel = message.channel;

		let success = true;
		let result = null;
		try {
			result = eval(code);
		} catch (error) {
			success = false;
			result = error;
		}
		stopwatch.stop();
		const type = new Type(result).toString();
		if (isThenable(result)) result = await result;
		if (typeof result !== 'string') {
			result = inspect(result, {
				depth: flags.depth,
				showHidden: flags.showHidden
			});
		}
		const time = this.formatTime(stopwatch.toString());
		return { result, success, type, time };
	}
	private formatTime(syncTime: string, asyncTime?: string) {
		return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
	}
	private async getHaste(result: string, language = 'js') {
		const { data } = await axios.post('https://hastebin.skyra.pw/documents', result);
		return `https://hastebin.skyra.pw/${data.key}.${language}`;
	}
}

type flags = {
	async: boolean;
	depth: number;
	showHidden: boolean;
};
