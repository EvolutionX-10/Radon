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
import { inspect } from 'node:util';
import axios from 'axios';
import { clean } from '#lib/utility';
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
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
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

		if (typeof result !== 'string') return;

		if (args.getFlags('haste')) {
			const url = await this.getHaste(result).catch(() => undefined);
			if (url) {
				return send(message, `Here's the result: <${url}>\n\n${footer}\n${time}`);
			}
			return send(message, `Failed to get haste url`);
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
		if (flags.async) code = `(async () => {\n${ar.join(';\n')}\nreturn ${last?.trim() ?? 'void'}\n\n})();`;
		// @ts-ignore
		const msg = message;
		// @ts-ignore
		const { guild, channel, member } = message;
		// @ts-ignore
		const { container: ctn } = this;
		// @ts-ignore
		const { client } = ctn;

		let success: boolean;
		let result: unknown;
		let asyncTime = ``;
		let syncTime = ``;
		let type: Type;
		let thenable = false;

		try {
			// eslint-disable-next-line no-eval
			result = eval(code);
			syncTime = stopwatch.toString();
			type = new Type(result);
		} catch (error) {
			if (!syncTime.length) syncTime = stopwatch.toString();
			if (thenable && !asyncTime.length) asyncTime = stopwatch.toString();
			if (!type!) type = new Type(error);
			success = false;
			result = error;
		}
		stopwatch.stop();

		if (isThenable(result)) {
			thenable = true;
			stopwatch.restart();
			result = await result;
			asyncTime = stopwatch.toString();
		}
		success = true;
		stopwatch.stop();

		if (typeof result !== 'string') {
			result = inspect(result, {
				depth: flags.depth,
				showHidden: flags.showHidden
			});
		}
		const time = this.formatTime(syncTime, asyncTime ?? '');

		return { result: clean(result as string), success, type, time };
	}

	private formatTime(syncTime: string, asyncTime?: string) {
		return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
	}

	private async getHaste(result: string, language = 'js') {
		const { data } = await axios.post('https://hastebin.skyra.pw/documents', result);
		return `https://hastebin.skyra.pw/${data.key}.${language}`;
	}
}

interface flags {
	async: boolean;
	depth: number;
	showHidden: boolean;
}
