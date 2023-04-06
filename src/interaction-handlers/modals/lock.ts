import { Color } from '#constants';
import { Embed } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { CategoryChannel, ChannelType, GuildChannel, ModalSubmitInteraction, Role, TextChannel, ThreadChannel } from 'discord.js';

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
		const options: Record<string, boolean> = {
			SendMessages: true,
			AddReactions: true,
			CreatePublicThreads: true,
			CreatePrivateThreads: true
		};

		await channel.permissionOverwrites
			.edit(channel.guild.members.me!, options, {
				reason: `Creating self permissions to avoid lock out`
			})
			.catch(() => (content += `\n> Something went wrong while creating self permissions! Please report this to my developers`));

		// * Set all permissions to false
		Object.keys(options).forEach((key) => (options[key] = false));
		if (!result.reason?.length) {
			await channel.permissionOverwrites.edit(role, options, {
				reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
			});
			return interaction.editReply(content);
		}

		const embed = new Embed()
			._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ forceStatic: false }) ?? undefined })
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
				new Embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ forceStatic: false }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}

		for (const channel of category.children.cache.values()) {
			if (this.isLocked(channel, role)) continue;
			await this.container.utils.wait(1_000);

			const options: Record<string, boolean | undefined> = {
				SendMessages: true,
				AddReactions: true,
				Connect: true,
				Speak: true,
				CreatePublicThreads: threads ? true : undefined,
				CreatePrivateThreads: threads ? true : undefined,
				UsePublicThreads: threads ? true : undefined,
				UsePrivateThreads: threads ? true : undefined,
				SendMessagesInThreads: threads ? true : undefined
			};

			channel.permissionOverwrites
				.edit(channel.guild.members.me!, options, {
					reason: `Creating self permissions to avoid lock out`
				})
				.catch(() => null);
			await this.container.utils.wait(100);

			// * Set all permissions to false
			Object.keys(options).forEach((key) => (options[key] = options[key] === true ? false : undefined));

			channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.then((c) => (c.isTextBased() && embeds.length ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async thread(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const { thread, content } = interaction.user.data as ThreadData;

		// TODO: check if thread (all) locks out itself during missing permissions
		if (result.reason?.length) {
			const embed = new Embed()
				._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ forceStatic: false }) ?? undefined })
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
		const options: Record<string, boolean> = {
			SendMessages: true,
			AddReactions: true,
			CreatePublicThreads: true,
			CreatePrivateThreads: true
		};

		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				new Embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ forceStatic: false }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === ChannelType.GuildText);
		for (const channel of channels.values()) {
			if (this.isLocked(channel, role) || channel.type !== ChannelType.GuildText) continue;
			await this.container.utils.wait(1_000);

			channel.permissionOverwrites
				.edit(channel.guild.members.me!, options, {
					reason: `Creating self permissions to avoid lock out`
				})
				.catch(() => null);
			await this.container.utils.wait(100);

			// * Set all permissions to false
			Object.keys(options).forEach((key) => (options[key] = false));
			channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.then((c) => (c.isTextBased() && embeds.length ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private async allThread(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		let { content, role } = interaction.user.data as TextAllData;
		const options = {
			CreatePublicThreads: false,
			CreatePrivateThreads: false,
			UsePublicThreads: false,
			UsePrivateThreads: false,
			SendMessagesInThreads: false
		};
		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				new Embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ forceStatic: false }) ?? undefined })
					._title('Channel Locked')
					._color(Color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === ChannelType.GuildText);
		for (const channel of channels.values()) {
			if (channel.type !== ChannelType.GuildText) continue;
			await this.container.utils.wait(1_000);

			const overwritten = await channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.catch(() => {
					content += `\n> Missing permissions to lock threads in <#${channel.id}>!`;
					return null;
				});

			if (overwritten && overwritten.isTextBased() && !overwritten.isVoiceBased() && embeds.length) {
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

		const options: Record<string, boolean> = {
			SendMessages: true,
			AddReactions: true,
			CreatePublicThreads: true,
			CreatePrivateThreads: true,
			UsePublicThreads: true,
			UsePrivateThreads: true,
			SendMessagesInThreads: true,
			Connect: true,
			Speak: true
		};

		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				new Embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ forceStatic: false }) ?? undefined })
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
				if (this.isLocked(channel, role) || channel.type !== ChannelType.GuildText) continue;
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
				.edit(channel.guild.members.me!, options, {
					reason: `Creating permissions to avoid self lock out`
				})
				.catch(() => null);
			await this.container.utils.wait(100);

			Object.keys(options).forEach((key) => (options[key] = false));
			channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.then((c) => (c.isTextBased() && embeds.length ? c.send({ embeds }) : null))
				.catch(() => (content += `\n> Missing permissions to lock <#${channel.id}>!`));
		}

		content.endsWith(':') ? (content += ' None 🎉') : null;

		return interaction.editReply(content);
	}

	private isLocked(channel: GuildChannel | ThreadChannel, role?: Role) {
		if (channel.isThread() && channel.locked) return true;
		if (channel.isTextBased() && channel.permissionsFor(role!).has('SendMessages')) return false;
		return !(channel.isVoiceBased() && channel.permissionsFor(role!).has('Connect'));
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
