/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { clean } from '#lib/utility';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Stopwatch } from '@sapphire/stopwatch';
import { Type } from '@sapphire/type';
import { codeBlock, isThenable } from '@sapphire/utilities';
import axios from 'axios';
import { inspect } from 'node:util';
@ApplyOptions<RadonCommand.Options>({
	aliases: ['ev'],
	quotes: [],
	permissionLevel: PermissionLevels.BotOwner,
	flags: ['hidden', 'haste', 'silent', 's', 'type', 't', 'v', 'value', 'this', 'stack', 'del', 'd'],
	options: ['depth'],
	description: 'Evaluate some code',
	guarded: true
})
export class UserCommand extends RadonCommand {
	public override async messageRun(message: RadonCommand.Message, args: RadonCommand.Args) {
		let code: string;
		if (args.getFlags('this') && message.reference?.messageId) {
			const msg = await message.channel.messages.fetch(message.reference.messageId);
			code = msg.content;
		} else code = await args.rest('string').catch(() => '');
		if (!code.length) return;

		if (args.getFlags('d', 'del')) await message.delete().catch(() => null);

		const { success, result, time, type } = await this.eval(
			message,
			code,
			{
				async: args.getFlags('async'),
				depth: Number(args.getOption('depth')) ?? 0,
				showHidden: args.getFlags('hidden'),
				stack: args.getFlags('stack')
			},
			args
		).catch((e: Error) => {
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
				await message.react(vars.emojis.cross).catch(() => null);
				return;
			}
			await message.react(vars.emojis.confirm).catch(() => null);
			return;
		}

		if (args.getFlags('type', 't')) {
			return send(message, type.toString());
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

		if (args.getFlags('v', 'value')) {
			return send(message, success ? result : 'Error occured');
		}

		return send(message, `${codeBlock('ts', result)}\n${footer}\n${time}`);
	}

	// @ts-expect-error
	private async eval(message: RadonCommand.Message, code: string, flags: flags, args: RadonCommand.Args) {
		const stopwatch = new Stopwatch();
		if (code.includes('await')) flags.async = true;
		const ar = code.split(';');
		const last = ar.pop();
		if (flags.async) code = `(async () => {\n${ar.join(';\n')}\nreturn ${last?.trim() ?? ' '}\n\n})();`;
		const msg = message;
		// @ts-ignore
		const { guild, channel, member } = msg;
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
			success = true;
		} catch (error) {
			if (!syncTime.length) syncTime = stopwatch.toString();
			if (thenable && !asyncTime.length) asyncTime = stopwatch.toString();
			if (!type!) type = new Type(error);
			success = false;
			result = flags.stack ? error : (error as Error).message;
		}
		stopwatch.stop();

		if (isThenable(result)) {
			thenable = true;
			stopwatch.restart();
			result = await result;
			asyncTime = stopwatch.toString();
		}
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
	stack: boolean;
}
