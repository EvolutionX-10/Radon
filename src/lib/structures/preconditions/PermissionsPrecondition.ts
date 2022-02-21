/* eslint-disable @typescript-eslint/no-namespace */
import type { Message } from 'discord.js';
import {
    AsyncPreconditionResult,
    Identifiers,
    PieceContext,
    Precondition,
    PreconditionContext,
    PreconditionOptions,
    PreconditionResult,
} from '@sapphire/framework';
import type { RadonCommand } from '#lib/structures';

export abstract class PermissionsPrecondition extends Precondition {
    private readonly guildOnly: boolean;

    public constructor(
        context: PieceContext,
        options: PermissionsPrecondition.Options = {}
    ) {
        super(context, options);
        this.guildOnly = options.guildOnly ?? true;
    }

    public async messageRun(
        message: Message,
        command: RadonCommand,
        context: PermissionsPrecondition.Context
    ): PermissionsPrecondition.AsyncResult {
        // If not in a guild, resolve on an error:
        if (message.guild === null || message.member === null) {
            return this.guildOnly
                ? this.error({ identifier: Identifiers.PreconditionGuildOnly })
                : this.ok();
        }

        // Run the specific precondition's logic:
        return this.handle(message, command, context);
    }

    public abstract handle(
        message: Message,
        command: RadonCommand,
        context: PermissionsPrecondition.Context
    ): PermissionsPrecondition.Result;
}

export namespace PermissionsPrecondition {
    export type Context = PreconditionContext;
    export type Result = PreconditionResult;
    export type AsyncResult = AsyncPreconditionResult;
    export interface Options extends PreconditionOptions {
        guildOnly?: boolean;
    }
}
