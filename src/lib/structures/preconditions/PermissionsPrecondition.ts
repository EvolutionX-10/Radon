/* eslint-disable @typescript-eslint/no-namespace */
import type { RadonCommand } from '#lib/structures';
import {
	AsyncPreconditionResult,
	ChatInputCommand,
	Command,
	ContextMenuCommand,
	Identifiers,
	PieceContext,
	Precondition,
	PreconditionContext,
	PreconditionOptions,
	PreconditionResult
} from '@sapphire/framework';
import type { CommandInteraction, ContextMenuInteraction, Message } from 'discord.js';

export abstract class PermissionsPrecondition extends Precondition {
	private readonly guildOnly: boolean;

	public constructor(context: PieceContext, options: PermissionsPrecondition.Options = {}) {
		super(context, options);
		this.guildOnly = options.guildOnly ?? true;
	}

	public override async messageRun(
		message: Message,
		command: Command,
		context: PermissionsPrecondition.Context
	): PermissionsPrecondition.AsyncResult {
		// If not in a guild, resolve on an error:
		if (message.guild === null || message.member === null) {
			return this.guildOnly ? this.error({ identifier: Identifiers.PreconditionGuildOnly }) : this.ok();
		}

		// Run the specific precondition's logic:
		return this.handle(message, command, context);
	}

	public override async chatInputRun(
		interaction: CommandInteraction,
		command: ChatInputCommand,
		context: PermissionsPrecondition.Context
	): PermissionsPrecondition.AsyncResult {
		if (interaction.guild === null || interaction.member === null) {
			return this.guildOnly ? this.error({ identifier: Identifiers.PreconditionGuildOnly }) : this.ok();
		}
		return this.handle(interaction, command, context);
	}

	public override async contextMenuRun(
		interaction: ContextMenuInteraction,
		command: ContextMenuCommand,
		context: PermissionsPrecondition.Context
	): PermissionsPrecondition.AsyncResult {
		if (interaction.guild === null || interaction.member === null) {
			return this.guildOnly ? this.error({ identifier: Identifiers.PreconditionGuildOnly }) : this.ok();
		}
		return this.handle(interaction, command, context);
	}

	public abstract handle(
		message: Message | CommandInteraction | ContextMenuInteraction,
		command: RadonCommand | ChatInputCommand | ContextMenuCommand | Command,
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
