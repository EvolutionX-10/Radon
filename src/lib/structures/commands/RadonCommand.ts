import type { GuildSettings } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { PermissionLevels } from '#lib/types';
import {
	ApplicationCommandRegistry,
	Args as SapphireArgs,
	type ChatInputCommandContext,
	Command,
	CommandOptionsRunTypeEnum,
	type ContextMenuCommandContext,
	type MessageCommandContext,
	PreconditionContainerArray,
	UserError
} from '@sapphire/framework';
import {
	AutocompleteInteraction,
	PermissionsBitField,
	PermissionFlagsBits,
	ChatInputCommandInteraction as ChatInputInteraction,
	ContextMenuCommandInteraction as CTXMenuCommandInteraction,
	UserContextMenuCommandInteraction as UserCTXMenuCommandInteraction,
	MessageContextMenuCommandInteraction as MessageCTXCommandInteraction
} from 'discord.js';
export abstract class RadonCommand extends Command {
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

	public constructor(context: Command.Context, options: RadonCommand.Options) {
		const perms = new PermissionsBitField(options.requiredClientPermissions).add(
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks,
			PermissionFlagsBits.ViewChannel
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

	protected parseConstructorPreConditions(options: RadonCommand.Options): void {
		super.parseConstructorPreConditions(options);
		this.parseConstructorPreConditionsPermissionLevel(options);
		if (options.community) {
			this.preconditions.append('Community');
		}
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
	export type Options = Command.Options & {
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
	export type ChatInputCommandInteraction = ChatInputInteraction<'cached'>;
	export type ContextMenuCommandInteraction = CTXMenuCommandInteraction<'cached'>;
	export type UserContextMenuCommandInteraction = UserCTXMenuCommandInteraction<'cached'>;
	export type MessageContextMenuCommandInteraction = MessageCTXCommandInteraction<'cached'>;
	export type AutoComplete = AutocompleteInteraction;
	export type Context = ChatInputCommandContext | ContextMenuCommandContext | Command.Context;
	export type Args = SapphireArgs;
	export type Message<K extends boolean = true> = GuildMessage<K>;
	export type Registry = ApplicationCommandRegistry;
}

declare module '@sapphire/framework' {
	interface Preconditions {
		BotOwner: never;
		Everyone: never;
		Moderator: never;
		Administrator: never;
		ServerOwner: never;
		Community: never;
	}
}
declare module 'discord.js' {
	interface Guild {
		settings: GuildSettings | null;
	}
}
