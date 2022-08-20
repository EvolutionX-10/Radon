import type { warnAction } from '#lib/types';
import type { GuildWarnsWarnlistWarns } from '@prisma/client';
import { container } from '@sapphire/framework';
import type { Guild, GuildMember } from 'discord.js';
const { prisma } = container;

export class Warn {
	public constructor(private readonly guild: Guild) {
		this.guild = guild;
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

		if (data) {
			const person = data.warnlist.filter((e) => e.id === member.id)?.[0];
			if (person) {
				if (person.warns.length >= 50) return undefined;
				await prisma.guildWarns.update({
					where: {
						id: this.guild.id
					},
					data: {
						warnlist: {
							set: { id: member.id, warns: [...person.warns, warn] }
						}
					},
					select: {
						warnlist: {
							select: {
								id: true
							}
						}
					}
				});
				return data;
			}
		}
		const doc = await prisma.guildWarns.upsert({
			create: {
				id: this.guild.id,
				warnlist: {
					set: { id: member.id, warns: [warn] }
				}
			},
			update: {
				warnlist: {
					set: { id: member.id, warns: [warn] }
				}
			},
			where: {
				id: this.guild.id
			}
		});
		return doc;
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
				await prisma.guildWarns.update({
					where: {
						id: this.guild.id
					},
					data: {
						warnlist: {
							set: { id: member.id, warns }
						}
					}
				});
				return data;
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
			const person = doc?.warnlist.filter((e) => e.id === member.id)?.[0];
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

	public async getAmount({ member }: { member: GuildMember }) {
		const doc = await prisma.guildWarns.findUnique({
			where: {
				id: this.guild.id
			}
		});

		if (doc) {
			const person = doc?.warnlist.filter((e) => e.id === member.id)?.[0];
			if (person) {
				return person.warns.length;
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

		if (data) {
			const { actions } = data;
			const exists = data.actions.find((e) => e.severity === severity);
			if (exists) return null;
			if (data.actions.length >= 10) return undefined;
			await prisma.guildWarns.update({
				where: {
					id: this.guild.id
				},
				data: {
					actions: {
						set: [...actions, { action, severity, expiration }]
					}
				}
			});
			return data;
		}
		return null;
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

		if (data) {
			return data.actions;
		}
		return null;
	}
}
