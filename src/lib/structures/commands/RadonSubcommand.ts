import { GuildContextMenuInteraction, GuildInteraction, GuildMessage, PermissionLevels } from '#lib/types';
import {
	ApplicationCommandRegistry,
	Args as SapphireArgs,
	ChatInputCommandContext,
	CommandOptionsRunTypeEnum,
	ContextMenuCommandContext,
	MessageCommandContext,
	PreconditionContainerArray,
	UserError
} from '@sapphire/framework';
import type { PieceContext } from '@sapphire/pieces';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { AutocompleteInteraction, Permissions } from 'discord.js';

export abstract class RadonSubcommand extends Subcommand<RadonSubcommand.Args, RadonSubcommand.Options> {
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
	/**
	 * Whether the command is only for community servers.
	 */
	public readonly community?: boolean;

	public constructor(context: PieceContext, options: RadonSubcommand.Options) {
		const perms = new Permissions(options.requiredClientPermissions).add(
			Permissions.FLAGS.SEND_MESSAGES,
			Permissions.FLAGS.EMBED_LINKS,
			Permissions.FLAGS.VIEW_CHANNEL
		);
		super(context, {
			generateDashLessAliases: true,
			requiredClientPermissions: perms,
			runIn: [CommandOptionsRunTypeEnum.GuildAny],
			...options
		});
		(this.guarded = options.guarded ?? false),
			(this.hidden = options.hidden ?? false),
			(this.permissionLevel = options.permissionLevel ?? PermissionLevels.Everyone),
			(this.community = options.community ?? false);
	}

	protected error(identifier: string | UserError, context?: unknown): never {
		throw typeof identifier === 'string' ? new UserError({ identifier, context }) : identifier;
	}

	protected parseConstructorPreConditions(options: RadonSubcommand.Options): void {
		super.parseConstructorPreConditions(options);
		this.parseConstructorPreConditionsPermissionLevel(options);
		if (options.community) {
			this.preconditions.append('Community');
		}
	}

	protected parseConstructorPreConditionsPermissionLevel(options: RadonSubcommand.Options): void {
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

export namespace RadonSubcommand {
	/**
	 * The RadonCommand Options
	 */
	export type Options = Subcommand.Options & {
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
		/**
		 * Whether the command is only for community servers.
		 */
		community?: boolean;
	};
	export type MessageContext = MessageCommandContext;
	export type ChatInputCommandInteraction = GuildInteraction;
	export type ContextMenuCommandInteraction = GuildContextMenuInteraction;
	export type AutoComplete = AutocompleteInteraction;
	export type Context = ChatInputCommandContext | ContextMenuCommandContext;
	export type Args = SapphireArgs;
	export type Message = GuildMessage;
	export type Registry = ApplicationCommandRegistry;
}
