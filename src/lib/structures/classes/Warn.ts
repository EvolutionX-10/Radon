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
			const person = data.warnlist.filter((e) => e.id === member.id)?.[0];

			if (person) {
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
			}
			return data;
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
}
