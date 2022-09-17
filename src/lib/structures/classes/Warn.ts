import type { warnAction } from '#lib/types';
import type { GuildWarnsWarnlistWarns } from '@prisma/client';
import { container } from '@sapphire/framework';
import type { Guild, GuildMember } from 'discord.js';
const { prisma } = container;

export class Warn {
	public constructor(private readonly guild: Guild) {}

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
		const data = await prisma.guildWarns.findUnique({
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

		const existingWarns = data?.warnlist.find((w) => w.id === member.id)?.warns;

		if (existingWarns && existingWarns.length >= 50) return undefined;

		return prisma.guildWarns.upsert({
			create: {
				id: this.guild.id,
				warnlist: {
					set: { id: member.id, warns: [warn] }
				}
			},
			update: {
				warnlist: {
					set: {
						id: member.id,
						warns: existingWarns //
							? [...existingWarns, warn]
							: [warn]
					}
				}
			},
			where: { id: this.guild.id }
		});
	}

	public async remove({ warnId, member }: { warnId: string; member: GuildMember }) {
		const data = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		if (data) {
			const person = data.warnlist.find((e) => e.id === member.id);
			const warn = person?.warns.find((e) => e.id === warnId);
			if (person && warn) {
				const warns = person.warns.filter((e) => e.id !== warnId);
				return prisma.guildWarns.update({
					where: {
						id: this.guild.id
					},
					data: {
						warnlist: {
							set: { id: member.id, warns }
						}
					}
				});
			}
			return null;
		}
		return null;
	}

	public async get({ member }: { member: GuildMember }) {
		const doc = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		if (doc) {
			const person = doc.warnlist.find((e) => e.id === member.id);
			if (person) {
				return {
					person,
					doc
				};
			}
		}
		return null;
	}

	public update({ member, warns }: { member: GuildMember; warns: GuildWarnsWarnlistWarns[] }) {
		return prisma.guildWarns.update({
			where: {
				id: this.guild.id
			},
			data: {
				warnlist: {
					set: { id: member.id, warns }
				}
			}
		});
	}

	public async getSeverity({ member }: { member: GuildMember }) {
		const doc = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		if (doc) {
			const person = doc.warnlist.find((e) => e.id === member.id);
			if (person) {
				const severity = person.warns.reduce((a, b) => a + b.severity, 0);
				return severity;
			}
		}
		return 0;
	}

	public async addAction({ action, severity, expiration }: { action: warnAction; severity: number; expiration?: number }) {
		const data = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		const existingActions = data?.actions;

		if (existingActions && existingActions.length >= 10) return undefined;

		return prisma.guildWarns.upsert({
			create: {
				id: this.guild.id,
				actions: { set: { action, severity, expiration } }
			},
			update: {
				actions: existingActions //
					? [...existingActions, { action, severity, expiration }]
					: { action, expiration, severity }
			},
			where: {
				id: this.guild.id
			}
		});
	}

	public async removeAction({ severity }: { severity: number }) {
		const data = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		if (data) {
			const actions = data.actions.filter((e) => e.severity !== severity);
			const action = data.actions.find((e) => e.severity === severity);
			await prisma.guildWarns.update({
				where: {
					id: this.guild.id
				},
				data: {
					actions: {
						set: actions
					}
				}
			});
			return action;
		}
		return null;
	}

	public async getActions() {
		const data = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		return data ? data.actions : null;
	}
}
