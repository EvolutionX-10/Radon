import { UserCommand as SetupCommand } from '../src/commands/Admin/setup.js';
import { Confirmation } from '../src/lib/structures/classes/Confirmation.js';
import { Embed } from '../src/lib/structures/classes/Embed.js';
import { describe, expect, it, mock, spyOn } from 'bun:test';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
	StringSelectMenuBuilder
} from 'discord.js';
import { card, componentMessage, identity, v2 } from '../src/lib/presentation/components.js';
import { modlogContainer, readModlog, updatedModlog } from '../src/lib/presentation/modlog.js';
import { reportContainer } from '../src/lib/presentation/reports.js';
import { endComponentPagination, updatePageMenu } from '../src/lib/presentation/pagination.js';
import { guideContainer, guideTopics } from '../src/lib/redemption/guide.js';
import { rewardContainer } from '../src/lib/rewards/presentation.js';
import { redemptionService } from '../src/lib/redemption/runtime.js';
import { getWarningLogIds } from '../src/lib/moderation/warningLog.js';
import { JustButtons } from '../src/lib/structures/classes/JustButtons.js';
import { ModalHandler } from '../src/interaction-handlers/modals/editModlog.js';
import { ButtonHandler as GuideHandler } from '../src/interaction-handlers/buttons/claimGuide.js';
import { UserHandler as ReportHandler } from '../src/interaction-handlers/buttons/reviewReport.js';
import { UserCommand as ClaimCommand } from '../src/commands/Special/claim.js';
import { UserCommand as CaseCommand } from '../src/commands/Moderation/case.js';
import { displayText } from './fixtures/presentation.js';

function components(payload: any) {
	const found: any[] = [];
	const visit = (items: any[]) => {
		for (const item of items ?? []) {
			const data = item.toJSON?.() ?? item;
			found.push(data);
			visit(data.components);
			if (data.accessory) visit([data.accessory]);
		}
	};
	visit(payload.components);
	return found;
}
function valid(payload: any) {
	expect(payload.flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
	expect(payload.content ?? null).toBeNull();
	expect(payload.embeds ?? []).toEqual([]);
	expect(components(payload).length).toBeLessThanOrEqual(40);
	expect(displayText(payload).length).toBeLessThanOrEqual(4000);
	for (const control of components(payload).filter((c) => c.custom_id)) expect(control.custom_id.length).toBeLessThanOrEqual(100);
}
const user = {
	id: '123456789012345678',
	name: 'Server nickname',
	username: 'account_name',
	avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
};
const caseId = '5e289f6c-e3bc-4904-bac1-4c613bc32c8f';
const warning = {
	title: 'Warn',
	description: 'Original reason',
	color: 0xf0b232,
	thumbnail: { url: user.avatar },
	fields: [
		{ name: 'Target', value: `**Server nickname** · <@${user.id}>` },
		{ name: 'Moderator', value: '<@223456789012345678>' },
		{ name: 'Warn ID', value: '`warn-example`' },
		{ name: 'Case reference', value: `\`${caseId}\`` }
	]
};

describe('Components V2 presentation compatibility', () => {
	it('serializes every guide and full reward screen within Discord limits with navigation intact', () => {
		for (const topic of guideTopics) {
			const payload = componentMessage(guideContainer(topic));
			valid(payload);
			expect(components(payload).filter((c) => c.custom_id?.startsWith('guide:'))).toHaveLength(7);
			expect(components(payload).find((c) => c.custom_id === `guide:${topic}`).style).toBe(ButtonStyle.Primary);
		}
		valid(
			componentMessage(
				rewardContainer(Date.now() + 60_000, [
					{ provider: 'topgg', status: 'verified' },
					{ provider: 'dbl', status: 'unavailable' }
				])
			)
		);
	});
	it('retains privacy, files, and button routes when presenting an existing response', () => {
		const payload = v2(
			{
				content: 'Done',
				flags: MessageFlags.Ephemeral,
				files: [{ attachment: Buffer.from('example'), name: 'result.txt' }],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setCustomId('unchanged:route').setLabel('Continue').setStyle(ButtonStyle.Primary)
					)
				]
			},
			'Action complete'
		);
		valid(payload);
		expect(payload.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
		expect(payload.files?.[0]).toHaveProperty('name', 'result.txt');
		expect(components(payload).find((c) => c.custom_id)?.custom_id).toBe('unchanged:route');
	});
	it('keeps long legacy embed output within the shared message text budget', () => {
		valid(
			v2({
				embeds: [
					new EmbedBuilder()
						.setTitle('Details')
						.setDescription('a'.repeat(4096))
						.addFields({ name: 'More', value: 'b'.repeat(1000) })
				]
			})
		);
	});
	it('uses a server nickname and server avatar before the account profile', async () => {
		const profile = { username: 'username', displayName: 'Global name', displayAvatarURL: () => 'https://example.com/user.png' };
		const member = { displayName: 'Guild nickname', user: profile, displayAvatarURL: () => 'https://example.com/guild.png' };
		const guild = { members: { cache: new Map([[user.id, member]]) } };
		expect(await identity(guild as any, user.id)).toMatchObject({ name: 'Guild nickname', avatar: 'https://example.com/guild.png' });
	});
	it('still displays a departed user, and a missing account remains readable', async () => {
		const guild = {
			members: {
				cache: new Map(),
				fetch: async () => {
					throw Error('Unknown member');
				}
			},
			client: {
				users: {
					cache: new Map(),
					fetch: async () => {
						throw Error('Unknown user');
					}
				}
			}
		};
		expect(
			(
				await identity(guild as any, user.id, {
					displayName: 'Former member',
					username: 'username',
					displayAvatarURL: () => user.avatar
				} as any)
			).name
		).toBe('Former member');
		expect((await identity(guild as any, user.id)).name).toBe('Unavailable user');
	});
	it('shows report identities and avatars while keeping actionable references and routes', () => {
		const payload = componentMessage(
			reportContainer(
				{ id: 'a'.repeat(32), excerpt: 'Reported content', messageUrl: 'https://discord.com/channels/1/2/3' },
				user,
				{ ...user, name: 'Reporter nickname' },
				true
			)
		);
		valid(payload);
		expect(displayText(payload)).toContain('Server nickname');
		expect(displayText(payload)).toContain('Reporter nickname');
		expect(components(payload).filter((c) => c.type === ComponentType.Thumbnail)).toHaveLength(2);
		expect(
			components(payload)
				.filter((c) => c.custom_id?.startsWith('report:'))
				.map((c) => c.custom_id)
		).toEqual([`report:dismiss:${'a'.repeat(32)}`, `report:timeout:${'a'.repeat(32)}`]);
	});
	it('keeps case references outside the title and retains warning IDs through a reason edit', () => {
		const panel = modlogContainer(warning);
		const payload = componentMessage(panel);
		valid(payload);
		expect(components(payload)[1].content).toBe('## Warn');
		expect(displayText(payload)).toContain(caseId);
		const message = { embeds: [], components: [panel] } as any;
		expect(getWarningLogIds(readModlog(message)!.fields!)).toEqual({ memberID: user.id, warnID: 'warn-example' });
		const edited = updatedModlog(message, 'Updated reason');
		valid(edited);
		expect(readModlog({ embeds: [], components: edited.components } as any)?.description).toBe('Updated reason');
		expect(displayText(edited)).toContain(caseId);
		expect(components(edited).find((c) => c.type === ComponentType.Thumbnail).media.url).toBe(user.avatar);
	});
	it('updates a V2 warning, linked case audit, and Discord reason using the existing modal', async () => {
		const updateReason = mock(async () => ({}));
		const edit = mock(async (_payload: any) => ({}));
		const atomicWrite = mock(async () => ({ ok: 1, value: { _id: caseId } }));
		const actor = { id: 'moderator', guild: { id: 'guild', ownerId: 'moderator' } };
		const message = { id: 'log', author: { id: 'bot' }, embeds: [], components: [modlogContainer(warning)], edit };
		const handler = {
			container: {
				prisma: { moderationCase: { findFirst: async () => ({ id: caseId, reason: 'Original reason' }) }, $runCommandRaw: atomicWrite }
			}
		};
		await ModalHandler.prototype.run.call(
			handler as any,
			{
				guild: { id: 'guild', members: { fetch: async () => actor }, settings: { warns: { updateReason } } },
				user: { id: 'moderator' },
				client: { user: { id: 'bot' } },
				deferReply: async () => {},
				editReply: async () => {}
			} as any,
			{ channel: { messages: { fetch: async () => message } }, messageId: 'log', reason: 'Changed reason' } as any
		);
		expect(updateReason).toHaveBeenCalledWith(user.id, 'warn-example', 'Changed reason');
		expect(atomicWrite).toHaveBeenCalledTimes(1);
		expect(readModlog({ embeds: [], components: edit.mock.calls[0][0].components } as any)?.description).toBe('Changed reason');
	});
	it('keeps the report visible after dismissal and disables only its review controls', async () => {
		const report = {
			id: 'a'.repeat(32),
			targetId: user.id,
			reviewMessageId: 'review',
			excerpt: 'Keep this evidence',
			messageUrl: 'https://discord.com/channels/1/2/3'
		};
		const edit = mock(async (_payload: any) => ({}));
		const actor = { id: 'mod', guild: { id: 'guild', ownerId: 'mod' } };
		const handler = {
			container: {
				prisma: { moderationReport: { findFirst: async () => report }, $runCommandRaw: async () => ({ ok: 1, value: {} }) },
				logger: { error: mock() }
			}
		};
		await ReportHandler.prototype.run.call(
			handler as any,
			{
				guildId: 'guild',
				guild: { members: { fetch: async () => actor } },
				user: { id: 'mod' },
				client: { user: { id: 'bot' } },
				message: {
					id: 'review',
					author: { id: 'bot' },
					flags: { has: () => true },
					components: [reportContainer(report, user, user, true)],
					edit
				},
				deferReply: async () => {},
				editReply: async () => {}
			} as any,
			{ id: report.id, action: 'dismiss' }
		);
		const payload = edit.mock.calls[0][0];
		expect(displayText(payload)).toContain('Keep this evidence');
		expect(displayText(payload)).toContain('dismissed');
		expect(
			components(payload)
				.filter((c) => c.custom_id?.startsWith('report:'))
				.every((c) => c.disabled)
		).toBe(true);
		expect(components(payload).find((c) => c.url)?.disabled).toBeUndefined();
	});
	it('opens a public guide button privately and converts an old private text guide on navigation', async () => {
		const reply = mock(async (_payload: any) => ({}));
		const update = mock(async (_payload: any) => ({}));
		await GuideHandler.prototype.run.call({} as any, { message: { flags: { has: () => false } }, reply, update } as any, 'cases');
		expect(update).not.toHaveBeenCalled();
		valid(reply.mock.calls[0][0]);
		expect(reply.mock.calls[0][0].flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
		await GuideHandler.prototype.run.call({} as any, { message: { flags: { has: () => true } }, reply, update } as any, 'games');
		expect(update.mock.calls[0][0].content).toBeNull();
		expect(update.mock.calls[0][0].embeds).toEqual([]);
		valid(update.mock.calls[0][0]);
	});
	it('preserves the selected page body and menu selection, then retains the body at expiry', async () => {
		const navigation = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId('pages').addOptions({ label: 'One', value: '0' }, { label: 'Two', value: '1' })
		);
		const first = v2({ embeds: [new EmbedBuilder().setTitle('First page').setDescription('First contents')] });
		const second = v2({ embeds: [new EmbedBuilder().setTitle('Second page').setDescription('Second contents')], components: [navigation] });
		const editReply = mock(async (_payload: any) => ({}));
		const handler = {
			index: 1,
			messages: [first, second],
			response: { isMessageComponent: () => false, editReply },
			collector: { removeAllListeners: mock() }
		};
		updatePageMenu(handler as any);
		expect(displayText(handler.messages[1])).toContain('Second contents');
		expect(components(handler.messages[1]).find((c) => c.type === ComponentType.StringSelect).options[1].default).toBe(true);
		await endComponentPagination(handler as any, 'time');
		expect(displayText(editReply.mock.calls[0][0])).toContain('Second contents');
		expect(components(editReply.mock.calls[0][0]).some((c) => c.type === ComponentType.StringSelect)).toBe(false);
	});
	it('acknowledges a pagination stop button while retaining its card', async () => {
		const update = mock(async (_payload: any) => ({}));
		await endComponentPagination(
			{
				index: 0,
				messages: [componentMessage(card('Saved page'))],
				response: { isMessageComponent: () => true, replied: false, deferred: false, update }
			} as any,
			'stop'
		);
		expect(update).toHaveBeenCalledTimes(1);
		expect(displayText(update.mock.calls[0][0])).toContain('Saved page');
	});
	it('renders real Sapphire page resolution as V2 and keeps cached pages idempotent', async () => {
		const paginator = new JustButtons().addPage({ embeds: [new EmbedBuilder().setTitle('Warnings').setDescription('Saved warning')] });
		const payload = await paginator.resolvePage({} as any, {} as any, 0);
		valid(payload);
		const cached = await paginator.resolvePage({} as any, {} as any, 0);
		expect(displayText(cached)).toBe(displayText(payload));
	});
	it('registers dedicated case help without removing any existing route', () => {
		let data: any;
		CaseCommand.prototype.registerApplicationCommands.call(
			{ name: 'case', description: 'Moderation cases' } as any,
			{
				registerChatInputCommand: (build: any) => {
					data = build(new SlashCommandBuilder()).toJSON();
				}
			} as any
		);
		expect(data.options.map((option: any) => option.name).sort()).toEqual(['help', 'history', 'note', 'reason', 'view']);
	});
	it('preserves the user’s null-preview coupon fix without posting or queuing alerts', async () => {
		const send = mock();
		const create = mock();
		const replies: any[] = [];
		const prisma = {
			redemptionGuildPolicy: { findUnique: async () => null },
			memberCodes: { findUnique: async () => null },
			couponAlert: { create }
		};
		const preview = spyOn(redemptionService(prisma as any), 'preview').mockResolvedValue(null);
		const interaction = {
			user: { id: user.id },
			guildId: 'guild',
			channelId: 'channel',
			member: { permissions: { has: () => true } },
			guild: { channels: { fetch: async () => ({ type: 0, permissionsFor: () => ({ has: () => true }), send }) } },
			options: { getString: (key: string) => (key === 'code' ? 'INVALID' : null), getChannel: () => null, getInteger: () => null },
			editReply: async (payload: any) => replies.push(payload)
		};
		try {
			await (ClaimCommand.prototype as any).post.call({ container: { prisma } }, interaction);
			expect(displayText(replies[0])).toContain('Coupon preview failed');
			expect(displayText(replies[0])).toContain('invalid');
			expect(send).not.toHaveBeenCalled();
			expect(create).not.toHaveBeenCalled();
		} finally {
			preview.mockRestore();
		}
	});
});

describe('interactive card lifecycle', () => {
	it('renders every setup stage without expecting a previous embed', async () => {
		const updates: any[] = [];
		const message = { id: 'wizard', embeds: [], components: [card('Setup')] };
		const interaction = {
			update: async (payload: any) => {
				updates.push(payload);
				return { interaction: { responseMessageId: 'wizard' } };
			},
			channel: { messages: { cache: new Map([['wizard', message]]) } }
		};
		const command = { welcome: () => new Embed()._title('Welcome to Radon')._description('Configure your server') };
		for (const step of ['step1', 'step2', 'step3', 'step4']) {
			expect(await (SetupCommand.prototype as any)[step].call(command, interaction, message, 1)).toBe(message);
			valid(updates.at(-1));
		}
		expect(components(updates[0]).find((c) => c.custom_id === 'mod_roles')).toBeDefined();
		expect(components(updates[1]).find((c) => c.custom_id === 'admin_roles')).toBeDefined();
		expect(components(updates[2]).find((c) => c.custom_id === 'modlog_channel')).toBeDefined();
		expect(components(updates[3]).find((c) => c.custom_id === 'private_modlog')).toBeDefined();
	});
	it('retains confirmation text when the buttons are disabled on selection', async () => {
		const events = new Map<string, (...args: any[]) => Promise<void>>();
		const collector = {
			on: (event: string, run: any) => {
				events.set(event, run);
			}
		};
		const message = { createMessageComponentCollector: () => collector };
		const onConfirm = mock();
		const followUp = mock(async (_payload: any) => ({ id: 'confirmation' }));
		const interaction = {
			user: { id: 'staff', tag: 'Staff', displayAvatarURL: () => user.avatar },
			followUp,
			channel: { messages: { cache: new Map([['confirmation', message]]) } }
		};
		const confirmation = new Confirmation({ content: 'Confirm this moderation action?', onConfirm, onCancel: mock() });
		await confirmation.run(interaction as any);
		valid(followUp.mock.calls[0][0]);
		const update = mock(async (_payload: any) => ({}));
		await events.get('collect')!({ user: { id: 'staff' }, customId: 'yes', update });
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(displayText(update.mock.calls[0][0])).toContain('Confirm this moderation action?');
		expect(
			components(update.mock.calls[0][0])
				.filter((c) => c.type === ComponentType.Button)
				.every((c) => c.disabled)
		).toBe(true);
	});
});
