import {
	ContainerBuilder,
	MediaGalleryBuilder,
	MessageFlags,
	MessageFlagsBitField,
	SectionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	escapeMarkdown,
	type APIEmbed,
	type BaseMessageOptions,
	type BitFieldResolvable,
	type Guild,
	type MessageFlagsString,
	type User
} from 'discord.js';

export const accents = { primary: 0x5865f2, success: 0x3ba55c, warning: 0xf0b232, danger: 0xed4245 };
export const clip = (value: string, limit: number) => (value.length > limit ? `${value.slice(0, limit - 1)}…` : value);
export const safe = (value: string, limit = 1000) => clip(escapeMarkdown(value), limit);
export const date = (value: Date) => `<t:${Math.floor(value.getTime() / 1000)}:f>`;

export function card(title: string, subtitle?: string, color = accents.primary) {
	const panel = new ContainerBuilder().setAccentColor(color);
	panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}${subtitle ? `\n${subtitle}` : ''}`));
	return panel;
}
export function text(panel: ContainerBuilder, content: string) {
	panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(content || '—'));
	return panel;
}
export function divider(panel: ContainerBuilder) {
	panel.addSeparatorComponents((separator) => separator);
	return panel;
}
export function componentMessage(...panels: ContainerBuilder[]) {
	return { components: panels, flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as const } };
}

/** Names and server avatars take precedence; departed users retain a readable fallback. */
export async function identity(guild: Guild, id: string, fallback?: User) {
	const member = guild.members.cache.get(id) ?? (await guild.members.fetch(id).catch(() => null));
	const user = member?.user ?? fallback ?? guild.client.users.cache.get(id) ?? (await guild.client.users.fetch(id).catch(() => null));
	return {
		id,
		name: member?.displayName ?? user?.displayName ?? user?.username ?? 'Unavailable user',
		avatar: member?.displayAvatarURL() ?? user?.displayAvatarURL(),
		username: user?.username
	};
}
export type Identity = Awaited<ReturnType<typeof identity>>;
export function person(panel: ContainerBuilder, label: string, user: Identity) {
	const content = `### ${label} · ${safe(user.name, 100)}\n<@${user.id}>${user.username ? ` · ${safe(user.username, 100)}` : ''}\n-# User ID: \`${user.id}\``;
	if (user.avatar) {
		panel.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(user.avatar).setDescription(`${user.name}'s avatar`))
		);
	} else text(panel, content);
	return panel;
}

/** Migrate an existing response without changing its visibility, attachments, or controls. */
type Presentable = Omit<BaseMessageOptions, 'content'> & {
	content?: string | null;
	flags?: BitFieldResolvable<MessageFlagsString, number>;
	ephemeral?: boolean;
	withResponse?: boolean;
};
export function v2<T extends Presentable>(value: T | string, title = 'Radon') {
	const payload = (typeof value === 'string' ? { content: value } : value) as T;
	const { content, embeds, components, flags, ephemeral, ...rest } = payload;
	const bitfield = new MessageFlagsBitField(flags).bitfield | (ephemeral ? MessageFlags.Ephemeral : 0) | MessageFlags.IsComponentsV2;
	// A prebuilt Components V2 layout is already designed for this screen.
	if (!content && !embeds?.length) return { ...rest, components, flags: bitfield as MessageFlags.IsComponentsV2 };
	const panels: ContainerBuilder[] = [];
	let remaining = 3800;
	const add = (panel: ContainerBuilder, value: string) => {
		if (remaining <= 0) return;
		const bounded = clip(value, remaining);
		text(panel, bounded);
		remaining -= bounded.length;
	};
	if (content) {
		const panel = card(title);
		remaining -= title.length + 4;
		add(panel, content);
		panels.push(panel);
	}
	for (const entry of embeds ?? []) {
		const embed: APIEmbed = 'toJSON' in entry ? entry.toJSON() : entry;
		const heading = embed.title ?? embed.author?.name ?? title;
		const panel = card(heading, undefined, embed.color ?? accents.primary);
		remaining -= heading.length + 4;
		if (embed.author && embed.title) add(panel, `-# ${embed.author.name}`);
		if (embed.description) {
			if (embed.thumbnail?.url && remaining > 0) {
				const description = clip(embed.description, remaining);
				panel.addSectionComponents((section) =>
					section.addTextDisplayComponents((t) => t.setContent(description)).setThumbnailAccessory((t) => t.setURL(embed.thumbnail!.url))
				);
				remaining -= description.length;
			} else add(panel, embed.description);
		}
		if (embed.fields?.length) {
			divider(panel);
			// Group fields in one text display so existing paginated pages stay under 40 components.
			add(panel, embed.fields.map((field) => `**${field.name}**\n${field.value}`).join('\n\n'));
		}
		if (embed.image?.url) panel.addMediaGalleryComponents(new MediaGalleryBuilder().addItems((item) => item.setURL(embed.image!.url)));
		if (embed.footer?.text) add(panel, `-# ${embed.footer.text}`);
		panels.push(panel);
	}
	return {
		...rest,
		components: [...panels, ...(components ?? [])],
		flags: bitfield as MessageFlags.IsComponentsV2
	};
}

export function messageText(message: { content: string; components: readonly unknown[] }) {
	if (message.content) return message.content;
	const parts: string[] = [];
	const visit = (items: readonly unknown[]) => {
		for (const item of items) {
			const data = (item as { toJSON?: () => any }).toJSON?.() ?? (item as any);
			if (data.type === 10) parts.push(data.content);
			if (data.components) visit(data.components);
		}
	};
	visit(message.components);
	return parts.join('\n').replace(/^## [^\n]+\n?/, '');
}
