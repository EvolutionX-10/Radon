import { ComponentType, TextDisplayBuilder, type APIEmbed, type Message } from 'discord.js';
import { card, clip, date, divider, text, componentMessage } from './components.js';

const Title = 59101;
const Reason = 59102;
const FieldStart = 59200;

/** Explicit component IDs retain the editable reason and warning references across restarts. */
export function modlogContainer(embed: APIEmbed) {
	const panel = card(embed.title ?? 'Moderation action', undefined, embed.color);
	panel.components[0].setId(Title);
	if (embed.timestamp) text(panel, `-# ${date(new Date(embed.timestamp))}`);
	divider(panel);
	text(panel, '### Reason');
	panel.addTextDisplayComponents(new TextDisplayBuilder().setId(Reason).setContent(clip(embed.description || 'No reason provided.', 2600)));
	for (const [index, field] of (embed.fields ?? []).entries()) {
		const display = new TextDisplayBuilder()
			.setId(FieldStart + index)
			.setContent(field.name === 'Case reference' ? `-# **${field.name}**\n-# ${field.value}` : `**${field.name}**\n${field.value}`);
		if (field.name === 'Target' && embed.thumbnail?.url) {
			panel.addSectionComponents((section) =>
				section.addTextDisplayComponents(display).setThumbnailAccessory((thumbnail) => thumbnail.setURL(embed.thumbnail!.url))
			);
		} else panel.addTextDisplayComponents(display);
	}

	return panel;
}

/** Old embed logs remain editable alongside the new Components V2 logs. */
export function readModlog(message: Pick<Message, 'embeds' | 'components'>): APIEmbed | undefined {
	if (message.embeds[0]) return message.embeds[0].data;
	const displays: { id?: number; content: string }[] = [];
	const visit = (components: readonly unknown[]) => {
		for (const component of components) {
			const data = (component as { toJSON?: () => unknown }).toJSON?.() ?? component;
			const item = data as { type: ComponentType; id?: number; content?: string; components?: unknown[] };
			if (item.type === ComponentType.TextDisplay && item.content) displays.push({ id: item.id, content: item.content });
			if (item.components) visit(item.components);
		}
	};
	visit(message.components ?? []);
	const title = displays.find((item) => item.id === Title)?.content.replace(/^## /, '');
	const description = displays.find((item) => item.id === Reason)?.content;
	if (!title || !description) return undefined;
	return {
		title,
		description,
		fields: displays
			.filter((item) => item.id! >= FieldStart && item.id! < FieldStart + 25)
			.map((item) => {
				const [heading, ...value] = item.content.split('\n');
				return { name: heading.replace(/^-# /, '').replaceAll('**', ''), value: value.join('\n').replace(/^-# /gm, '') };
			})
	};
}

/** Replace only the reason display, retaining the original avatars, references and buttons. */
export function updatedModlog(message: Pick<Message, 'components'>, reason: string) {
	const replace = (item: any): any => {
		const data = item.toJSON?.() ?? item;
		return {
			...data,
			...(data.id === Reason ? { content: reason } : {}),
			...(data.components ? { components: data.components.map(replace) } : {})
		};
	};
	return { ...componentMessage(), components: message.components.map(replace) };
}
