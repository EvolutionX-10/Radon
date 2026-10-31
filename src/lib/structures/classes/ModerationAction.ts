import type { GuildInteraction, ModActionData, TimeoutActionData } from '#lib/types';
import { isGuildOwner, isModerator, isOwner, runAllChecks } from '#lib/utility';
import { Guild, User, Routes } from 'discord.js';
import { container } from '@sapphire/framework';
import type { PrismaClient } from '@prisma/client';
import {
	guardScheduledBanReplacement,
	assertBanDispatchWindow,
	banDispatchReason,
	finishBanDispatch,
	recoverBanDispatch
} from '../../moderation/temporaryBans.js';

export class ModerationAction {
	public constructor(
		public readonly guild: Guild,
		private readonly prisma?: PrismaClient
	) {}

	/** Resolves only after the entire action succeeds; callers may log success afterwards. */
	public async invoke(
		data: ModActionData,
		options: { deleteMessageSeconds?: number; removeTimeout?: boolean; temporaryBanGeneration?: string } = {}
	) {
		const { action, reason } = data;
		if (data.moderator.guild.id !== this.guild.id) throw new Error('The moderator must belong to this server.');
		// Confirmations can outlive a role revocation. Fetch current membership before executing.
		const moderator = await this.guild.members.fetch({ user: data.moderator.id, force: true });
		let target = data.target;
		if (target instanceof User) {
			try {
				target = await this.guild.members.fetch({ user: target.id, force: true });
			} catch (error) {
				// Only an explicit Unknown Member response permits an ID ban without hierarchy checks.
				if ((error as { code?: number }).code !== 10007) throw error;
			}
		} else {
			target = await this.guild.members.fetch({ user: target.id, force: true });
		}
		if (moderator.id !== this.guild.members.me?.id && !isGuildOwner(moderator) && !isOwner(moderator.user)) {
			const roles = await this.guild.settings?.roles.snapshot();
			if (!isModerator(moderator, [...(roles?.admins ?? []), ...(roles?.mods ?? [])])) throw new Error('You no longer have moderator access.');
		}
		if (moderator.guild.id !== this.guild.id) throw new Error('The moderator must belong to this server.');
		const { content, result } = runAllChecks(moderator, target, action);
		if (!result) throw new Error(content);

		switch (action) {
			case 'ban':
			case 'softban': {
				const seconds = options.deleteMessageSeconds ?? (action === 'softban' ? 86_400 : 0);
				if (!Number.isInteger(seconds) || seconds < 0 || seconds > 604_800) throw new Error('Message deletion must be between 0 and 7 days.');
				const dispatch = await guardScheduledBanReplacement(
					this.prisma ?? container.prisma,
					this.guild.id,
					target.id,
					reason ?? '',
					options.temporaryBanGeneration
				);
				if (!dispatch) {
					await this.guild.bans.create(target.id, { deleteMessageSeconds: seconds, reason });
					if (action === 'softban') await this.guild.members.unban(target.id, reason);
				} else {
					let submitted = false;
					try {
						assertBanDispatchWindow(dispatch);
						submitted = true;
						await this.guild.client.rest.put(Routes.guildBan(this.guild.id, target.id), {
							body: { delete_message_seconds: seconds },
							reason: banDispatchReason(dispatch, reason ?? ''),
							signal: AbortSignal.timeout(60_000)
						});
						this.guild.bans.cache.delete(target.id);
						if (action === 'softban') {
							assertBanDispatchWindow(dispatch);
							await this.guild.client.rest.delete(Routes.guildBan(this.guild.id, target.id), {
								reason,
								signal: AbortSignal.timeout(60_000)
							});
							this.guild.bans.cache.delete(target.id);
						}
						if (!(await finishBanDispatch(this.prisma ?? container.prisma, dispatch)))
							throw new Error('The ban completed but its persisted schedule outcome could not be confirmed.');
					} catch (error) {
						const status = (error as { status?: number }).status;
						const definiteFailure =
							!submitted || (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429);
						await recoverBanDispatch(this.prisma ?? container.prisma, dispatch, error, definiteFailure);
						throw error;
					}
				}
				break;
			}
			case 'kick':
				if (target instanceof User) throw new Error('Kicks require a server member.');
				await target.kick(reason);
				break;
			case 'timeout': {
				if (target instanceof User) throw new Error('Timeouts require a server member.');
				const timestamp = (data as TimeoutActionData).duration?.timestamp;
				if (!options.removeTimeout && (!Number.isFinite(timestamp) || timestamp <= Date.now() || timestamp > Date.now() + 2_419_200_000)) {
					throw new Error('Timeout duration must be greater than zero and at most 28 days.');
				}
				await target.disableCommunicationUntil(options.removeTimeout ? null : timestamp, reason);
				break;
			}
			default:
				throw new Error(`Unknown action: ${action}`);
		}
		return this;
	}

	public reply(interaction: GuildInteraction, reply: string) {
		if (interaction.replied || interaction.deferred) return interaction.editReply({ content: reply });
		return interaction.reply(reply);
	}
}
