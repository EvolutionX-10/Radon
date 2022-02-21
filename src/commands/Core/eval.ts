/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { RadonCommand } from '#lib/structures';
import { PermissionLevels } from '#lib/types';
import { vars } from '#vars';
import { ApplyOptions } from '@sapphire/decorators';
import type { Args } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { Stopwatch } from '@sapphire/stopwatch';
import { Type } from '@sapphire/type';
import { codeBlock, isThenable } from '@sapphire/utilities';
import type { Message } from 'discord.js';
import { inspect } from 'util';
import axios from 'axios';
import { des } from '#lib/messages';
@ApplyOptions<RadonCommand.Options>({
    aliases: ['ev'],
    quotes: [],
    permissionLevel: PermissionLevels.BotOwner,
    flags: true,
    options: true,
    description: des.core.eval,
    guarded: true,
})
export class UserCommand extends RadonCommand {
    public async messageRun(message: Message, args: Args) {
        if (args.getFlags('cc', 'c')) {
            console.clear();
            await message.react(vars.emojis.confirm);
            return;
        }

        const code = await args.rest('string');
        const { success, result, time, type } = await this.eval(message, code, {
            async: args.getFlags('async'),
            depth: Number(args.getOption('depth')) ?? 0,
            showHidden: args.getFlags('hidden', 'showHidden'),
        });
        const footer = codeBlock('ts', type);
        if (args.getFlags('haste')) {
            const url = await this.getHaste(result).catch(() => undefined);
            if (url) {
                return send(
                    message,
                    `Here's the result: <${url}>\n\n${footer}\n${time}`
                );
            } else return send(message, `Failed to get haste url`);
        }
        if (args.getFlags('silent', 's')) {
            if (!success && result) {
                await message.react(vars.emojis.cross);
                this.container.logger.fatal(`oops`);
                return null;
            }
            await message.react(vars.emojis.confirm);
            return null;
        }

        if (result.length > 1900) {
            return send(message, {
                content: `Output was too long... sent the result as a file.\n\n${footer}`,
                files: [{ attachment: Buffer.from(result), name: 'output.js' }],
            });
        }

        return send(message, `${codeBlock('ts', result)}\n${footer}\n${time}`);
    }
    private async eval(message: Message, code: string, flags: flags) {
        const stopwatch = new Stopwatch();
        if (flags.async) code = `(async () => {\n${code}\n})();`;
        // @ts-ignore
        const msg = message,
            client = this.container.client,
            guild = message.guild;

        let success = true;
        let result = null;

        try {
            // eslint-disable-next-line no-eval
            result = eval(code);
        } catch (error) {
            if (error && error instanceof Error && error.stack) {
                // this.container.client.logger.error(error.message)
            }
            result = error;
            success = false;
        }
        stopwatch.stop();
        const type = new Type(result).toString();
        if (isThenable(result)) result = await result;

        if (typeof result !== 'string') {
            result = inspect(result, {
                depth: flags.depth,
                showHidden: flags.showHidden,
            });
        }
        const time = this.formatTime(stopwatch.toString());
        return { result, success, type, time };
    }
    private formatTime(syncTime: string, asyncTime?: string) {
        return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
    }
    private async getHaste(result: string, language = 'js') {
        const { data } = await axios.post(
            'https://hastebin.skyra.pw/documents',
            result
        );
        return `https://hastebin.skyra.pw/${data.key}.${language}`;
    }
}

type flags = {
    async: boolean;
    depth: number;
    showHidden: boolean;
};
