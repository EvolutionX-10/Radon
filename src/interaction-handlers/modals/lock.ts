import type { Embed } from '#lib/structures';
import { color } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { CategoryChannel, GuildChannel, ModalSubmitInteraction, Role, TextChannel, ThreadChannel } from 'discord.js';

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
		}
	}

	public override parse(interaction: ModalSubmitInteraction) {
		const { customId } = interaction;
		if (!customId.startsWith('@lock')) return this.none();

		const reason = interaction.fields.getTextInputValue('reason');

		return this.some({ reason });
	}

	private async text(interaction: ModalSubmitInteraction, result: InteractionHandler.ParseResult<this>) {
		const { channel, content, role } = interaction.user.data as TextData;
		const options = {
			SEND_MESSAGES: false,
			ADD_REACTIONS: false,
			CREATE_PUBLIC_THREADS: false,
			CREATE_PRIVATE_THREADS: false
		};
		const update = await channel.permissionOverwrites
			.edit(role, options, {
				reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
			})
			.catch(() => null);

		if (!update) return interaction.editReply(`Failed to lock channel for ${role}!`);
		if (!result.reason?.length) {
			return interaction.editReply(content);
		}

		const embed = this.container.utils
			.embed()
			._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
			._title('Channel Locked')
			._color(color.Utility)
			._description(result.reason)
			._timestamp();

		await channel.send({ embeds: [embed] });
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
					._color(color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}

		for await (const channel of category.children.values()) {
			if (this.isLocked(channel, role)) continue;
			await wait(1_000);

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

		if (result.reason?.length) {
			const embed = this.container.utils
				.embed()
				._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
				._title('Channel Locked')
				._color(color.Utility)
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
		const embeds: Embed[] = [];

		if (result.reason?.length) {
			embeds.push(
				this.container.utils
					.embed()
					._author({ name: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) ?? undefined })
					._title('Channel Locked')
					._color(color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_TEXT');
		for await (const channel of channels.values()) {
			if (this.isLocked(channel, role) || channel.type !== 'GUILD_TEXT') continue;
			await wait(1_000);

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
					._color(color.Utility)
					._description(result.reason)
					._timestamp()
			);
		}
		const channels = interaction.guild!.channels.cache.filter((c) => c.type === 'GUILD_TEXT');
		for await (const channel of channels.values()) {
			if (channel.type !== 'GUILD_TEXT') continue;
			await wait(1_000);

			channel.permissionOverwrites
				.edit(role, options, {
					reason: `Requested by ${interaction.user.tag} (${interaction.user.id})`
				})
				.then((c) =>
					c.isText() && embeds.length
						? c.threads.fetchActive().then((fetched) => fetched.threads.forEach((thread) => thread.send({ embeds }).catch(() => null)))
						: null
				)
				.catch(() => (content += `\n> Missing permissions to lock threads in <#${channel.id}>!`));
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

async function wait(ms: number) {
	const wait = (await import('node:util')).promisify(setTimeout);
	return wait(ms);
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

type LockReasonModalId = '@lock/text' | '@lock/category' | '@lock/thread' | '@lock/all/text' | '@lock/all/thread';
