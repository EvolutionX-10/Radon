/* eslint-disable @typescript-eslint/no-namespace */
import { SubCommandPluginCommand } from '@sapphire/plugin-subcommands';
import {
	ApplicationCommandRegistry,
	Args as SapphireArgs,
	ChatInputCommandContext,
	ContextMenuCommandContext,
	MessageCommandContext,
	Piece,
	PieceContext,
	PreconditionContainerArray,
	UserError
} from '@sapphire/framework';
import { PermissionLevels } from '#lib/types';
import { AutocompleteInteraction, CommandInteraction, ContextMenuInteraction, Message as Msg, Permissions } from 'discord.js';
import type { GuildSettings } from '#lib/structures';
export abstract class RadonCommand extends SubCommandPluginCommand<RadonCommand.Args, RadonCommand> {
	/**
	 * Whether the command can be disabled.
	 */
	public readonly guarded?: boolean;
	/**
	 * Whether the command is hidden from everyone.
	 */
	public readonly hidden?: boolean;
	/**
	 * The permission level required to run the command.
	 */
	public readonly permissionLevel?: PermissionLevels;

	public constructor(context: PieceContext, options: RadonCommand.Options) {
		const perms = new Permissions(options.requiredClientPermissions).add(
			Permissions.FLAGS.SEND_MESSAGES,
			Permissions.FLAGS.EMBED_LINKS,
			Permissions.FLAGS.VIEW_CHANNEL
		);
		super(context, {
			generateDashLessAliases: true,
			requiredClientPermissions: perms,
			...options
		});
		(this.guarded = options.guarded ?? false),
			(this.hidden = options.hidden ?? false),
			(this.permissionLevel = options.permissionLevel ?? PermissionLevels.Everyone);
	}

	protected error(identifier: string | UserError, context?: unknown): never {
		throw typeof identifier === 'string' ? new UserError({ identifier, context }) : identifier;
	}

	protected parseConstructorPreConditions(options: RadonCommand.Options): void {
		super.parseConstructorPreConditions(options);
		this.parseConstructorPreConditionsPermissionLevel(options);
	}

	protected parseConstructorPreConditionsPermissionLevel(options: RadonCommand.Options): void {
		if (options.permissionLevel === PermissionLevels.BotOwner) {
			this.preconditions.append('BotOwner');
			return;
		}

		const container = new PreconditionContainerArray(['BotOwner'], this.preconditions);
		switch (options.permissionLevel ?? PermissionLevels.Everyone) {
			case PermissionLevels.Everyone:
				container.append('Everyone');
				break;
			case PermissionLevels.Moderator:
				container.append('Moderator');
				break;
			case PermissionLevels.Administrator:
				container.append('Administrator');
				break;
			case PermissionLevels.ServerOwner:
				container.append('ServerOwner');
				break;
			default:
				throw new Error(
					`RadonCommand[${this.name}]: "permissionLevel" was specified as an invalid permission level (${options.permissionLevel}).`
				);
		}

		this.preconditions.append(container);
	}
}
export namespace RadonCommand {
	/**
	 * The RadonCommand Options
	 */
	export type Options = SubCommandPluginCommand.Options & {
		/**
		 * Whether the command can be disabled.
		 */
		guarded?: boolean;
		/**
		 * Whether the command is hidden from everyone.
		 */
		hidden?: boolean;
		/**
		 * The permission level required to run the command.
		 */
		permissionLevel?: number;
	};
	export type MessageContext = MessageCommandContext;
	export type ChatInputCommandInteraction = CommandInteraction;
	export type ContextMenuCommandInteraction = ContextMenuInteraction;
	export type AutoComplete = AutocompleteInteraction;
	export type Context = ChatInputCommandContext | ContextMenuCommandContext;
	export type Args = SapphireArgs;
	export type Message = Msg;
	export type Registry = ApplicationCommandRegistry;
}

declare module '@sapphire/framework' {
	interface ArgType {
		piece: Piece;
		command: RadonCommand;
		amount: string;
	}
	interface Preconditions {
		BotOwner: never;
		Everyone: never;
		Moderator: never;
		Administrator: never;
		ServerOwner: never;
	}

	interface DetailedDescriptionCommandObject {
		usages?: string[];
		extendedHelp?: string;
		explainedUsage?: [string, string][];
		possibleFormats?: [string, string][];
		examples?: (null | string)[];
		reminder?: string;
	}
}
declare module 'discord.js' {
	interface Message {
		sudo: GuildMember | null;
	}
	interface Guild {
		settings: GuildSettings | null;
	}
}
