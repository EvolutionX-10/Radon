import type { warnAction, RefinedMemberWarnData } from '#lib/types';
import type { guildWarns as GuildWarnings, MemberWarnData, PrismaClient } from '@prisma/client';
import type { Guild, GuildMember } from 'discord.js';

const MAX_WARNINGS = 50;
const MAX_ACTIONS = 10;
const MAX_WRITE_ATTEMPTS = 20;

type Mutation<T> = { write: boolean; value: T };

export class Warn {
	public constructor(
		private readonly guild: Guild,
		private readonly prisma: PrismaClient
	) {}

	/**
	 * Compare-and-swap the guild document so all limits and edits are evaluated
	 * against the version that is actually committed. Missing/null revisions are
	 * legacy documents and are upgraded by their first successful write.
	 */
	private async mutate<T>(change: (state: GuildWarnings) => Mutation<T>): Promise<T> {
		for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
			const existing = await this.prisma.guildWarns.findUnique({ where: { id: this.guild.id } });
			const revision = existing?.revision ?? 0;
			const now = new Date();
			const state: GuildWarnings = existing
				? structuredClone(existing)
				: { id: this.guild.id, warnlist: [], actions: [], revision: 0, createdAt: now, updatedAt: now };
			state.revision = revision + 1;
			state.updatedAt = now;
			const mutation = change(state);
			if (!mutation.write) return mutation.value;

			if (!existing) {
				try {
					await this.prisma.guildWarns.create({ data: state });
					return mutation.value;
				} catch (error) {
					// Another instance created this guild while it was being read.
					if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error;
				}
			} else {
				// Prisma's Mongo updateMany resolves matching IDs before issuing the
				// update. Use a native command so the revision predicate is checked
				// by MongoDB as part of the write itself, including across processes.
				const updated = await this.prisma.$runCommandRaw({
					update: 'guildWarns',
					updates: [
						{
							q: { _id: this.guild.id, ...(revision === 0 ? { $or: [{ revision: 0 }, { revision: null }] } : { revision }) },
							u: {
								$set: {
									warnlist: mongoWarnings(state.warnlist),
									actions: state.actions,
									revision: state.revision,
									updatedAt: { $date: now.toISOString() }
								}
							},
							upsert: false,
							multi: false
						}
					],
					ordered: true
				});
				if (updated.ok !== 1 || updated.writeConcernError || (Array.isArray(updated.writeErrors) && updated.writeErrors.length)) {
					throw new Error('The warning update was not acknowledged by MongoDB.');
				}
				if (updated.n === 1) return mutation.value;
				if (updated.n !== 0) throw new Error('MongoDB returned an unexpected warning update result.');
			}

			// Jitter prevents contending bot instances repeatedly retrying together.
			await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * Math.min(100, 2 ** attempt))));
		}
		throw new Error('Warnings changed too frequently. Please retry the operation.');
	}

	public async add({
		warnId,
		member,
		reason,
		severity,
		expiration,
		mod
	}: {
		warnId: string;
		member: GuildMember;
		reason: string;
		severity: number;
		expiration: Date;
		mod: GuildMember;
	}) {
		const date = new Date();
		return this.mutate<WarningAdded | undefined>((state) => {
			let person = state.warnlist.find((entry) => entry.id === member.id);
			if (person?.warns.length && person.warns.length >= MAX_WARNINGS) return { write: false, value: undefined };
			if (person?.warns.some((warn) => warn.id === warnId)) throw new Error('This warning ID already exists.');
			if (!person) {
				person = { id: member.id, warns: [] };
				state.warnlist.push(person);
			}
			const previousSeverity = activeSeverity(person.warns, state.updatedAt!);
			person.warns.push({ id: warnId, date, expiration, mod: mod.id, reason, severity });
			return { write: true, value: { ...state, previousSeverity, severity: activeSeverity(person.warns, state.updatedAt!) } };
		});
	}

	public async remove(warnId: string, member: GuildMember) {
		return this.mutate<GuildWarnings | null>((state) => {
			const person = state.warnlist.find((entry) => entry.id === member.id);
			if (!person?.warns.some((warn) => warn.id === warnId)) return { write: false, value: null };
			person.warns = person.warns.filter((warn) => warn.id !== warnId);
			return { write: true, value: state };
		});
	}

	public async get(member: GuildMember) {
		const doc = await this.prisma.guildWarns.findUnique({ where: { id: this.guild.id } });
		const person = doc?.warnlist.find((entry) => entry.id === member.id);
		return person && doc ? { person, doc } : null;
	}

	public async updateReason(memberId: string, warnId: string, reason: string) {
		return this.mutate<GuildWarnings | null>((state) => {
			const warn = state.warnlist.find((person) => person.id === memberId)?.warns.find((entry) => entry.id === warnId);
			if (!warn) return { write: false, value: null };
			warn.reason = reason;
			return { write: true, value: state };
		});
	}

	public async getRefined(member: GuildMember): Promise<RefinedMemberWarnData | null> {
		const raw = await this.get(member);
		return raw ? refine(raw.person, new Date()) : null;
	}

	public async getAll(guildId: string): Promise<RefinedMemberWarnData[]> {
		const doc = await this.prisma.guildWarns.findUnique({ where: { id: guildId } });
		const now = new Date();
		return (doc?.warnlist ?? [])
			.map((person) => refine(person, now))
			.filter((person) => person.active.length + person.inactive.length > 0)
			.sort((a, b) => {
				if (a.active.length > 0 && b.active.length === 0) return -1;
				if (b.active.length > 0 && a.active.length === 0) return 1;
				const latest = (person: RefinedMemberWarnData) =>
					Math.max(...(person.active.length ? person.active : person.inactive).map((warn) => warn.date.getTime()));
				return latest(b) - latest(a);
			});
	}

	public async getSeverity(member: GuildMember) {
		const raw = await this.get(member);
		return activeSeverity(raw?.person.warns ?? [], new Date());
	}

	public async addAction({ action, severity, expiration }: { action: warnAction; severity: number; expiration?: number }) {
		return this.mutate<GuildWarnings | null | undefined>((state) => {
			if (state.actions.some((entry) => entry.severity === severity)) return { write: false, value: null };
			if (state.actions.length >= MAX_ACTIONS) return { write: false, value: undefined };
			state.actions.push({ action, severity, expiration: expiration ?? null });
			return { write: true, value: state };
		});
	}

	public async removeAction(severity: number) {
		return this.mutate<GuildWarnings['actions'][number] | null>((state) => {
			const action = state.actions.find((entry) => entry.severity === severity);
			if (!action) return { write: false, value: null };
			state.actions = state.actions.filter((entry) => entry.severity !== severity);
			return { write: true, value: action };
		});
	}

	public async getActions() {
		const data = await this.prisma.guildWarns.findUnique({ where: { id: this.guild.id } });
		return data ? data.actions.sort((a, b) => a.severity - b.severity) : null;
	}
}

export type WarningAdded = GuildWarnings & { previousSeverity: number; severity: number };

/** Native commands use database field names and MongoDB Extended JSON dates. */
function mongoWarnings(warnlist: MemberWarnData[]) {
	return warnlist.map((person) => ({
		_id: person.id,
		warns: person.warns.map((warn) => ({
			_id: warn.id,
			date: { $date: warn.date.toISOString() },
			expiration: warn.expiration ? { $date: warn.expiration.toISOString() } : null,
			mod: warn.mod,
			reason: warn.reason,
			severity: warn.severity
		}))
	}));
}

function activeSeverity(warns: MemberWarnData['warns'], now: Date) {
	return warns.reduce((total, warn) => total + (!warn.expiration || warn.expiration > now ? warn.severity : 0), 0);
}

function refine(person: MemberWarnData, now: Date): RefinedMemberWarnData {
	return {
		id: person.id,
		active: person.warns.filter((warn) => !warn.expiration || warn.expiration > now),
		inactive: person.warns.filter((warn) => warn.expiration && warn.expiration <= now)
	};
}
