import type { warnAction, RefinedMemberWarnData } from '#lib/types';
import type { MemberWarnData, PrismaClient } from '@prisma/client';
import type { Guild, GuildMember } from 'discord.js';

export class Warn {
	public constructor(
		private readonly guild: Guild,
		private readonly prisma: PrismaClient
	) {}

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
		const data = await this.prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		const warn = {
			id: warnId,
			reason,
			severity,
			expiration,
			mod: mod.id,
			date: new Date()
		};

		const existingWarnList = data?.warnlist;
		const existingWarns = existingWarnList?.find((w) => w.id === member.id)?.warns;

		if (existingWarns && existingWarns.length >= 50) return undefined;

		const warns = existingWarns //
			? [...existingWarns, warn]
			: [warn];

		if (existingWarnList) {
			existingWarnList.forEach((person) => {
				// * Warns of that person is found, mutating the object!
				if (person.id === member.id) person.warns = warns;
			});
			if (!existingWarnList.find((m) => m.id === member.id)) {
				// * new person's warn data;
				existingWarnList.push({
					id: member.id,
					warns
				});
			}
		}
		return this.prisma.guildWarns.upsert({
			create: {
				id: this.guild.id,
				warnlist: {
					set: { id: member.id, warns: [warn] }
				}
			},
			update: { warnlist: existingWarnList },
			where: { id: this.guild.id }
		});
	}

	public async remove(warnId: string, member: GuildMember) {
		const data = await this.prisma.guildWarns.findUnique({
			where: { id: this.guild.id }
		});

		if (data) {
			const existingWarnList = data.warnlist;
			const person = existingWarnList.find((e) => e.id === member.id);
			const warn = person?.warns.find((e) => e.id === warnId);
			if (person && warn) {
				person.warns = person.warns.filter((e) => e.id !== warnId);
				return this.prisma.guildWarns.update({
					where: {
						id: this.guild.id
					},
					data: {
						warnlist: existingWarnList
					}
				});
			}
		}
		return null;
	}

	public async get(member: GuildMember) {
		const doc = await this.prisma.guildWarns.findUnique({ where: { id: this.guild.id } });

		if (doc) {
			const person = doc.warnlist.find((e) => e.id === member.id);
			if (person) {
				return { person, doc };
			}
		}
		return null;
	}

	public async getRefined(member: GuildMember): Promise<RefinedMemberWarnData | null> {
		const raw = await this.get(member);
		if (!raw) return null;

		const { person } = raw;
		// refine the data to return RefinedMemberWarnData
		const refined: RefinedMemberWarnData = {
			id: person.id,
			active: person.warns.filter((w) => !w.expiration || w.expiration > new Date()),
			inactive: person.warns.filter((w) => w.expiration && w.expiration <= new Date())
		};
		return refined;
	}

	public async getAll(guildId: string): Promise<RefinedMemberWarnData[]> {
		const doc = await this.prisma.guildWarns.findUnique({
			where: { id: guildId }
		});

		if (doc) {
			// return sorted warns , latest active first, then those who have inactive only
			return doc.warnlist
				.map((e) => ({
					id: e.id,
					active: e.warns.filter((w) => !w.expiration || w.expiration > new Date()),
					inactive: e.warns.filter((w) => w.expiration && w.expiration <= new Date())
				}))
				.filter((e) => e.active.length + e.inactive.length > 0)
				.sort((a, b) => {
					if (b.active.length > 0 && a.active.length === 0) return 1; // b has active, a has none
					if (a.active.length > 0 && b.active.length === 0) return -1; // a has active, b has none
					if (b.active.length > 0 && a.active.length > 0) {
						// both have active, sort by latest active warn
						const latestA = a.active.reduce((prev, current) => (prev.date > current.date ? prev : current));
						const latestB = b.active.reduce((prev, current) => (prev.date > current.date ? prev : current));
						return latestB.date.getTime() - latestA.date.getTime();
					}
					// both have no active warns, sort by latest inactive warn
					const latestA = a.inactive.reduce((prev, current) => (prev.date > current.date ? prev : current));
					const latestB = b.inactive.reduce((prev, current) => (prev.date > current.date ? prev : current));
					return latestB.date.getTime() - latestA.date.getTime();
				});
		}
		return [];
	}

	public update(warnlist: MemberWarnData[]) {
		return this.prisma.guildWarns.update({
			where: { id: this.guild.id },
			data: { warnlist }
		});
	}

	public async getSeverity(member: GuildMember) {
		const doc = await this.prisma.guildWarns.findUnique({
			where: { id: this.guild.id }
		});

		if (doc) {
			const person = doc.warnlist.find((e) => e.id === member.id);
			if (person) {
				const activeWarns = person.warns.filter((w) => !w.expiration || w.expiration > new Date());
				const severity = activeWarns.reduce((a, b) => a + b.severity, 0);
				return severity;
			}
		}
		return 0;
	}

	public async addAction({ action, severity, expiration }: { action: warnAction; severity: number; expiration?: number }) {
		const data = await this.prisma.guildWarns.findUnique({
			where: { id: this.guild.id }
		});

		const existingActions = data?.actions;

		if (existingActions && existingActions.length >= 10) return undefined;

		return this.prisma.guildWarns.upsert({
			create: {
				id: this.guild.id,
				actions: { set: { action, severity, expiration } }
			},
			update: {
				actions: existingActions //
					? [...existingActions, { action, severity, expiration }]
					: { action, expiration, severity }
			},
			where: { id: this.guild.id }
		});
	}

	public async removeAction(severity: number) {
		const data = await this.prisma.guildWarns.findUnique({ where: { id: this.guild.id } });

		if (data) {
			const actions = data.actions.filter((e) => e.severity !== severity);
			const action = data.actions.find((e) => e.severity === severity);
			await this.prisma.guildWarns.update({
				where: { id: this.guild.id },
				data: { actions: { set: actions } }
			});
			return action;
		}
		return null;
	}

	public async getActions() {
		const data = await this.prisma.guildWarns.findUnique({
			where: { id: this.guild.id }
		});

		return data ? data.actions.sort((a, b) => a.severity - b.severity) : null;
	}
}
