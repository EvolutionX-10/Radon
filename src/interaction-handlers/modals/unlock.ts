import type { Embed } from '#lib/structures';
import { Color } from '#constants';
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
			case '@unlock/text':
				return this.text(interaction, result);
			case '@unlock/category':
				return this.category(interaction, result);
			case '@unlock/thread':
				return this.thread(interaction, result);
			case '@unlock/all/text':
				return this.allText(interaction, result);
			case '@unlock/all/thread':
				return this.allThread(interaction, result);
			case '@unlock/server':
				return this.server(interaction, result);
		}
	}

	public override parse(interaction: ModalSubmitInteraction) {
		const { customId } = interaction;
		if (!customId.startsWith('@unlock')) return this.none();

		const reason = interaction.fields.getTextInputValue('reason');

		return this.some({ reason });
	}

	private async text(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { channel, content, role } = interaction.user.data as TextData;
		const options = {
			SEND_MESSAGES: null,
			ADD_REACTIONS: null,
			CREATE_PUBLIC_THREADS: null,
			CREATE_PRIVATE_THREADS: null
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
			.catch(() => (content += `Something went wrong while creating self permissions! Please report this to my developers`));

		if (!result.reason?.length) {
			await channel.permissionOverwrites.edit(role, options, {
				reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
			});
			return interaction.editReply(content);
		}

		const embed = this.container.utils
			.embed()
			._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
			._title('Channel Unlocked')
			._color(Color.Utility)
			._description(result.reason)
			._timestamp();

		await channel
			.send({ embeds: [embed] })
			.catch(
				() =>
					(content = `<#${channel.id}> was unlocked successfully for ${role}!\n\nIssues Found:\n> Couldn't send a message due to missing permission!`)
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
					._title('Channel Unlocked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
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
		for await (const channel of category.children.values()) {
			if (!this.isLocked(channel, role)) continue;
			await this.container.utils.wait(500);
			await channel.permissionOverwrites
				.edit(channel.guild.me!, roptions, {
					reason: `Creating self permissions to avoid lock out`
				})
				.catch(() => null);
			await channel.permissionOverwrites
				.edit(
					role,
					{
						SEND_MESSAGES: null,
						ADD_REACTIONS: null,
						CONNECT: null,
						SPEAK: null,
						CREATE_PUBLIC_THREADS: threads ? null : undefined,
						CREATE_PRIVATE_THREADS: threads ? null : undefined,
						USE_PUBLIC_THREADS: threads ? null : undefined,
						USE_PRIVATE_THREADS: threads ? null : undefined,
						SEND_MESSAGES_IN_THREADS: threads ? null : undefined
					},
					{
						reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
					}
				)
				.then((c) => (embeds.length && c.isText() ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing Permissions to unlock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async thread(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const { thread, content } = interaction.user.data as ThreadData;

		if (result.reason?.length) {
			const embed = this.container.utils
				.embed()
				._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
				._title('Channel Unlocked')
				._color(Color.Utility)
				._description(result.reason)
				._timestamp();

			await thread.send({ embeds: [embed] });
		}

		const archive = await thread.setArchived(false, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(() => null);

		const lock = await thread.setLocked(false, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(() => null);

		if ((!lock && !archive) || !archive) return interaction.reply('Failed to unlock thread!');

		return interaction.editReply(content);
	}

	private async allText(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { content, role } = interaction.user.data as TextAllData;
		const options = {
			SEND_MESSAGES: null,
			ADD_REACTIONS: null,
			CREATE_PUBLIC_THREADS: null,
			CREATE_PRIVATE_THREADS: null
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
					._title('Channel Unlocked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_TEXT');
		for await (const channel of channels.values()) {
			if (!this.isLocked(channel, role) || channel.type !== 'GUILD_TEXT') continue;
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
				.catch(() => (content += `\n> Missing permissions to unlock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async allThread(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { content, role } = interaction.user.data as TextAllData;
		const options = {
			CREATE_PUBLIC_THREADS: null,
			CREATE_PRIVATE_THREADS: null,
			USE_PUBLIC_THREADS: null,
			USE_PRIVATE_THREADS: null,
			SEND_MESSAGES_IN_THREADS: null
		};
		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				this.container.utils
					.embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
					._title('Channel Unlocked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_TEXT');
		for await (const channel of channels.values()) {
			if (channel.type !== 'GUILD_TEXT') continue;
			await this.container.utils.wait(1_000);

			const overwritten = await channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.catch(() => {
					content += `\n> Missing permissions to unlock threads in <#${channel.id}>!`;
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
			SEND_MESSAGES: null,
			ADD_REACTIONS: null,
			CREATE_PUBLIC_THREADS: null,
			CREATE_PRIVATE_THREADS: null,
			USE_PUBLIC_THREADS: null,
			USE_PRIVATE_THREADS: null,
			SEND_MESSAGES_IN_THREADS: null,
			CONNECT: null,
			SPEAK: null
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
					._title('Channel Unlocked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		if (!deep) {
			const channels = interaction.guild!.channels.cache;
			let i = 0;
			for await (const channel of channels.values()) {
				if (!this.isLocked(channel, role) || channel.type !== 'GUILD_TEXT') continue;
				await this.container.utils.wait(1_000);
				embeds.length ? channel.send({ embeds }).catch(() => i++) : null;
			}

			const perms = role.permissions.add([
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.AddReactions,
				PermissionFlagsBits.CreatePublicThreads,
				PermissionFlagsBits.Connect,
				PermissionFlagsBits.SendMessagesInThreads,
				PermissionFlagsBits.Speak
			]);

			if (i !== 0) content += `\n> Couldn't send message in ${i} channels due to missing permissions!`;

			role.setPermissions(perms.bitfield, `Requested by ${interaction.user.tag} (${interaction.user.id})`).catch(
				() => (content += `\n> Missing permissions to edit role ${role}`)
			);

			content.endsWith(':') ? (content += ' None 🎉') : null;

			return interaction.editReply(content);
		}

		const channels = interaction.guild!.channels.cache;
		for await (const channel of channels.values()) {
			if (!this.isLocked(channel, role) || channel instanceof ThreadChannel) continue;
			await this.container.utils.wait(1_000);

			channel.permissionOverwrites
				.edit(channel.guild.me!, roptions, {
					reason: 'Creating self permissions to avoid lock out'
				})
				.catch(() => null);
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

type LockReasonModalId = '@unlock/text' | '@unlock/category' | '@unlock/thread' | '@unlock/all/text' | '@unlock/all/thread' | '@unlock/server';
