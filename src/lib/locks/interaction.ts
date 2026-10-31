import { v2 } from '../presentation/components.js';
import type { PrismaClient } from '@prisma/client';
import {
	ActionRowBuilder,
	ChannelType,
	GuildChannel,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	type Guild,
	type ModalSubmitInteraction
} from 'discord.js';
import type { RadonCommand } from '../structures/commands/RadonCommand.js';
import { isAdmin, isOwner } from '../utility/functions/permissions.js';
import { parseLockDuration } from './expiry.js';
import { LockService, runLockBatch, type LockTarget } from './LockService.js';
import { lockSessions, type LockScope, type LockSession } from './sessions.js';
import { lockStore } from './store.js';
import { channelTarget, roleTarget, threadTarget, TEXT_FLAGS, THREAD_FLAGS, VOICE_FLAGS, SERVER_FLAGS } from './targets.js';

export async function beginLockPrompt(interaction: RadonCommand.ChatInputCommandInteraction, action: 'lock' | 'unlock', scope: LockScope) {
	const role = interaction.options.getRole('role') ?? interaction.guild.roles.everyone;
	if (scope !== 'thread' && (role.managed || (role.id !== interaction.guildId && !role.editable))) {
		return interaction.reply(
			v2({ content: 'This role is managed or is at or above my highest role.', flags: MessageFlags.Ephemeral }, 'Channel access')
		);
	}
	const token = lockSessions.create({
		userId: interaction.user.id,
		guildId: interaction.guildId,
		action,
		scope,
		roleId: role.id,
		channelId: interaction.options.getChannel('channel')?.id,
		threads: interaction.options.getBoolean('threads') ?? false,
		deep: interaction.options.getBoolean('deep') ?? false
	});
	const reason = new TextInputBuilder()
		.setCustomId('reason')
		.setLabel('Reason (optional)')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(512)
		.setRequired(false);
	const modal = new ModalBuilder()
		.setTitle(action === 'lock' ? 'Lock' : 'Restore lock')
		.setCustomId(`radon-lock:${action}:${token}`)
		.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reason));
	if (action === 'lock') {
		const duration = new TextInputBuilder()
			.setCustomId('duration')
			.setLabel('Duration (optional, e.g. 10m or 2h)')
			.setStyle(TextInputStyle.Short)
			.setMaxLength(40)
			.setRequired(false);
		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(duration));
	}
	return interaction.showModal(modal);
}

async function authorize(interaction: ModalSubmitInteraction<'cached'>, session: LockSession, prisma: PrismaClient) {
	const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
	const settings = await prisma.guildSettings.findUnique({ where: { id: interaction.guildId } });
	const admin =
		isAdmin(member) ||
		member.id === interaction.guild.ownerId ||
		member.roles.cache.some((role) => settings?.adminRoles.includes(role.id) ?? false);
	const mod = admin || member.roles.cache.some((role) => settings?.modRoles.includes(role.id) ?? false);
	const bulk = session.scope.startsWith('all ') || session.scope === 'server';
	if (!isOwner(interaction.user) && !(bulk ? admin : mod))
		throw new Error(`You no longer have ${bulk ? 'administrator' : 'moderator'} access to this operation.`);
	const bot = await interaction.guild.members.fetchMe({ force: true });
	if (!bot.permissions.has('ManageRoles')) throw new Error('I need Manage Roles to change lock permissions.');
	const role = await interaction.guild.roles.fetch(session.roleId, { force: true });
	if (session.scope !== 'thread' && (!role || role.managed || (role.id !== interaction.guildId && !role.editable)))
		throw new Error('The selected role is missing, managed, or above my highest role.');
}

export async function getLockTargets(guild: Guild, session: LockSession): Promise<LockTarget[]> {
	const channel = (flags: readonly (typeof SERVER_FLAGS)[number][], id = session.channelId!) => channelTarget(guild, id, session.roleId, flags);
	if (session.scope === 'text') return [channel(TEXT_FLAGS)];
	if (session.scope === 'voice') return [channel(VOICE_FLAGS)];
	if (session.scope === 'thread') return [threadTarget(guild, session.channelId!)];
	if (session.scope === 'server' && !session.deep) return [roleTarget(guild, session.roleId)];
	const channels = await guild.channels.fetch();
	return [...channels.values()].flatMap((value) => {
		if (!(value instanceof GuildChannel) || value.isThread() || value.type === ChannelType.GuildCategory) return [];
		if (session.scope === 'category' && value.parentId !== session.channelId) return [];
		if (session.scope === 'all voice' && !value.isVoiceBased()) return [];
		if ((session.scope === 'all text' || session.scope === 'all thread') && value.type !== ChannelType.GuildText) return [];
		const flags =
			session.scope === 'all thread'
				? THREAD_FLAGS
				: value.isVoiceBased()
					? VOICE_FLAGS
					: session.scope === 'category' && !session.threads
						? (['SendMessages', 'AddReactions'] as const)
						: TEXT_FLAGS;
		return [channel(flags, value.id)];
	});
}

export async function completeLockPrompt(interaction: ModalSubmitInteraction, prisma: PrismaClient) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	if (!interaction.inCachedGuild()) return interaction.editReply(v2('This operation requires a server.', 'Channel access'));
	const [, action, token] = interaction.customId.split(':');
	const session = lockSessions.consume(token, interaction.user.id, interaction.guildId);
	if (!session || session.action !== action)
		return interaction.editReply(v2('This lock prompt expired or belongs to another session. Run the command again.', 'Channel access'));
	try {
		await authorize(interaction, session, prisma);
		const reason = interaction.fields.getTextInputValue('reason').trim();
		const auditReason = `Requested by ${interaction.user.tag} (${interaction.user.id})${reason ? `: ${reason}` : ''}`.slice(0, 512);
		const targets = await getLockTargets(interaction.guild, session);
		const duration =
			session.action === 'lock' && interaction.fields.fields.has('duration')
				? parseLockDuration(interaction.fields.getTextInputValue('duration'))
				: null;
		const expiresAt = duration === null ? null : new Date(Date.now() + duration);
		const service = new LockService(lockStore(prisma));
		let missing = 0;
		const result = await runLockBatch(
			targets,
			async (target) => {
				const outcome =
					session.action === 'lock' ? await service.lock(target, auditReason, expiresAt) : await service.unlock(target, auditReason);
				if (outcome === 'busy') throw new Error('Another lock operation is running; try again shortly.');
				if (outcome === 'no snapshot') missing++;
				return outcome === 'locked' || outcome === 'restored';
			},
			(target) => (target.kind === 'role' ? `<@&${target.targetId}>` : `<#${target.targetId}>`),
			(done, total) => interaction.editReply(v2(`Processing ${session.action}: ${done}/${total} targets finished…`, 'Channel access'))
		);
		let content = `${session.action === 'lock' ? 'Locked' : 'Restored'} **${result.completed}** target(s); skipped **${result.skipped}**; failed **${result.failures.length}**.`;
		if (missing)
			content += `\n${missing} target(s) have no saved lock. Locks created before this update must be restored manually; Radon will not guess their original permissions.`;
		if (result.failures.length)
			content += `\n${result.failures
				.slice(0, 8)
				.map((failure) => `- ${failure}`)
				.join('\n')}\nFailed locks retain their recovery snapshot. Retry the matching unlock command.`;
		if (expiresAt && result.completed) content += `\nAutomatic restoration scheduled for <t:${Math.floor(expiresAt.getTime() / 1000)}:F>.`;
		if (reason) content += `\nReason: ${reason}`;
		return interaction.editReply(v2({ content: content.slice(0, 2000), allowedMentions: { parse: [] } }, 'Channel access'));
	} catch (error) {
		return interaction.editReply(
			v2(
				{
					content: `Lock operation failed: ${error instanceof Error ? error.message : 'Unexpected error'}`.slice(0, 2000),
					allowedMentions: { parse: [] }
				},
				'Channel access'
			)
		);
	}
}
