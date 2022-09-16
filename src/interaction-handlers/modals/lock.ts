import { Color } from '#constants';
import type { Embed } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { CategoryChannel, GuildChannel, ModalSubmitInteraction, Role, TextChannel, ThreadChannel } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override async run(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const { customId } = interaction;
		await interaction.deferReply();

		switch (customId as LockReasonModalId) {
			case '@lock/text':
				return this.text(interaction, result);
			case '@lock/category':
				return this.category(interaction, result);
			case '@lock/thread':
				return this.thread(interaction, result);
			case '@lock/all/text':
				return this.allText(interaction, result);
			case '@lock/all/thread':
				return this.allThread(interaction, result);
			case '@lock/server':
				return this.server(interaction, result);
		}
	}

	public override parse(interaction: ModalSubmitInteraction) {
		const { customId } = interaction;
		if (!customId.startsWith('@lock')) return this.none();

		const reason = interaction.fields.getTextInputValue('reason');

		return this.some({ reason });
	}

	private async text(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { channel, content, role } = interaction.user.data as TextData;
		const options = {
			SEND_MESSAGES: false,
			ADD_REACTIONS: false,
			CREATE_PUBLIC_THREADS: false,
			CREATE_PRIVATE_THREADS: false
		};

		const roptions = {
			SEND_MESSAGES: true,
			ADD_REACTIONS: true,
			CREATE_PUBLIC_THREADS: true,
			CREATE_PRIVATE_THREADS: true
		};

		await channel.permissionOverwrites
			.edit(channel.guild.me!, roptions, {
				reason: `Creating self permissions to avoid lock out`
			})
			.catch(() => (content += `\n> Something went wrong while creating self permissions! Please report this to my developers`));

		if (!result.reason?.length) {
			await channel.permissionOverwrites.edit(role, options, {
				reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
			});
			return interaction.editReply(content);
		}

		const embed = this.container.utils
			.embed()
			._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
			._title('Channel Locked')
			._color(Color.Utility)
			._description(result.reason)
			._timestamp();

		await channel
			.send({ embeds: [embed] })
			.catch(
				() =>
					(content = `<#${channel.id}> was locked successfully for ${role}!\n\nIssues Found:\n> Couldn't send a message due to missing permission!`)
			);

		await channel.permissionOverwrites.edit(role, options, {
			reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
		});
		return interaction.editReply(content);
	}

	private async category(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { category, content, role, threads } = interaction.user.data as CategoryData;

		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				this.container.utils
					.embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}

		for (const channel of category.children.values()) {
			if (this.isLocked(channel, role)) continue;
			await this.container.utils.wait(1_000);

			const roptions = {
				SEND_MESSAGES: true,
				ADD_REACTIONS: true,
				CONNECT: true,
				SPEAK: true,
				CREATE_PUBLIC_THREADS: threads ? true : undefined,
				CREATE_PRIVATE_THREADS: threads ? true : undefined,
				USE_PUBLIC_THREADS: threads ? true : undefined,
				USE_PRIVATE_THREADS: threads ? true : undefined,
				SEND_MESSAGES_IN_THREADS: threads ? true : undefined
			};

			channel.permissionOverwrites
				.edit(channel.guild.me!, roptions, {
					reason: `Creating self permissions to avoid lock out`
				})
				.catch(() => null);
			await this.container.utils.wait(100);

			channel.permissionOverwrites
				.edit(
					role,
					{
						SEND_MESSAGES: false,
						ADD_REACTIONS: false,
						CONNECT: false,
						SPEAK: false,
						CREATE_PUBLIC_THREADS: threads ? false : undefined,
						CREATE_PRIVATE_THREADS: threads ? false : undefined,
						USE_PUBLIC_THREADS: threads ? false : undefined,
						USE_PRIVATE_THREADS: threads ? false : undefined,
						SEND_MESSAGES_IN_THREADS: threads ? false : undefined
					},
					{
						reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
					}
				)
				.then((c) => (c.isText() && embeds.length ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async thread(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const { thread, content } = interaction.user.data as ThreadData;

		// TODO: check if thread (all) locks out itself during missing permissions
		if (result.reason?.length) {
			const embed = this.container.utils
				.embed()
				._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
				._title('Channel Locked')
				._color(Color.Utility)
				._description(result.reason)
				._timestamp();

			await thread.send({ embeds: [embed] });
		}

		const lock = await thread.setLocked(true, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(() => null);

		const archive = await thread.setArchived(true, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(() => null);

		if ((!lock && !archive) || !archive) return interaction.editReply('Failed to lock thread!');

		return interaction.editReply(content);
	}

	private async allText(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { content, role } = interaction.user.data as TextAllData;
		const options = {
			SEND_MESSAGES: false,
			ADD_REACTIONS: false,
			CREATE_PUBLIC_THREADS: false,
			CREATE_PRIVATE_THREADS: false
		};
		const roptions = {
			SEND_MESSAGES: true,
			ADD_REACTIONS: true,
			CREATE_PUBLIC_THREADS: true,
			CREATE_PRIVATE_THREADS: true
		};

		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				this.container.utils
					.embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_TEXT');
		for (const channel of channels.values()) {
			if (this.isLocked(channel, role) || channel.type !== 'GUILD_TEXT') continue;
			await this.container.utils.wait(1_000);

			channel.permissionOverwrites
				.edit(channel.guild.me!, roptions, {
					reason: `Creating self permissions to avoid lock out`
				})
				.catch(() => null);
			await this.container.utils.wait(100);
			channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.then((c) => (c.isText() && embeds.length ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async allThread(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { content, role } = interaction.user.data as TextAllData;
		const options = {
			CREATE_PUBLIC_THREADS: false,
			CREATE_PRIVATE_THREADS: false,
			USE_PUBLIC_THREADS: false,
			USE_PRIVATE_THREADS: false,
			SEND_MESSAGES_IN_THREADS: false
		};
		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				this.container.utils
					.embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_TEXT');
		for (const channel of channels.values()) {
			if (channel.type !== 'GUILD_TEXT') continue;
			await this.container.utils.wait(1_000);

			const overwritten = await channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.catch(() => {
					content += `\n> Missing permissions to lock threads in <#${channel.id}>!`;
					return null;
				});

			if (overwritten && overwritten.isText() && overwritten.type !== 'GUILD_VOICE' && embeds.length) {
				const active = await overwritten.threads.fetchActive().catch(() => null);
				if (!active) return;
				for (const thread of active.threads.values()) {
					await thread.send({ embeds }).catch(() => null);
				}
			}
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async server(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { content, role, deep } = interaction.user.data as ServerData;
		const options = {
			SEND_MESSAGES: false,
			ADD_REACTIONS: false,
			CREATE_PUBLIC_THREADS: false,
			CREATE_PRIVATE_THREADS: false,
			USE_PUBLIC_THREADS: false,
			USE_PRIVATE_THREADS: false,
			SEND_MESSAGES_IN_THREADS: false,
			CONNECT: false,
			SPEAK: false
		};
		const roptions = {
			SEND_MESSAGES: true,
			ADD_REACTIONS: true,
			CREATE_PUBLIC_THREADS: true,
			CREATE_PRIVATE_THREADS: true,
			USE_PUBLIC_THREADS: true,
			USE_PRIVATE_THREADS: true,
			SEND_MESSAGES_IN_THREADS: true,
			CONNECT: true,
			SPEAK: true
		};
		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				this.container.utils
					.embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}

		if (!deep) {
			const channels = interaction.guild!.channels.cache;
			let i = 0;
			for (const channel of channels.values()) {
				if (this.isLocked(channel, role) || channel.type !== 'GUILD_TEXT') continue;
				await this.container.utils.wait(1_000);
				embeds.length ? channel.send({ embeds }).catch(() => i++) : null;
			}
			const perms = role.permissions.remove([
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.AddReactions,
				PermissionFlagsBits.CreatePublicThreads,
				PermissionFlagsBits.Connect,
				PermissionFlagsBits.SendMessagesInThreads,
				PermissionFlagsBits.Speak
			]);
			if (i !== 0) content += `\n> Couldn't send messages in ${i} channels due to missing permissions!`;

			role.setPermissions(perms.bitfield, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(
				() => (content += `\n> Missing permissions to edit role ${role}`)
			);
			content.endsWith(':') ? (content += ' None 🎉') : null;

			return interaction.editReply(content);
		}
		const channels = interaction.guild!.channels.cache;
		for (const channel of channels.values()) {
			if (this.isLocked(channel, role) || channel instanceof ThreadChannel) continue;
			await this.container.utils.wait(1_000);

			channel.permissionOverwrites
				.edit(channel.guild.me!, roptions, {
					reason: `Creating permissions to avoid self lock out`
				})
				.catch(() => null);
			await this.container.utils.wait(100);
			channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.then((c) => (c.isText() && embeds.length ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private isLocked(channel: GuildChannel | ThreadChannel, role?: Role) {
		if (channel.isThread() && channel.locked) return true;
		if (channel.isText() && channel.permissionsFor(role!).has('SEND_MESSAGES')) return false;
		return !(channel.isVoice() && channel.permissionsFor(role!).has('CONNECT'));
	}
}

interface TextData {
	content: string;
	channel: TextChannel;
	role: Role;
}

interface CategoryData {
	content: string;
	category: CategoryChannel;
	role: Role;
	threads: boolean;
}

interface ThreadData {
	content: string;
	thread: ThreadChannel;
}

interface TextAllData {
	content: string;
	role: Role;
}

interface ServerData extends TextAllData {
	deep: boolean;
}
type LockReasonModalId = '@lock/text' | '@lock/category' | '@lock/thread' | '@lock/all/text' | '@lock/all/thread' | '@lock/server';
