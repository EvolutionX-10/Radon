import { warnsDB } from '#models';
import type { Guild, GuildMember } from 'discord.js';

export class Warn {
    constructor(private readonly guild: Guild) {
        this.guild = guild;
    }
    public async add({
        warnid,
        member,
        reason,
        severity,
        expiration,
        mod,
    }: {
        warnid: string;
        member: GuildMember;
        reason: string;
        severity: number;
        expiration: Date;
        mod: GuildMember;
    }) {
        const exist = await warnsDB.findOne({
            _id: this.guild.id,
        });
        if (exist as warnsData) {
            const person = exist?.warnlist.filter(
                (e) => e._id === member.id
            )?.[0];
            if (person) {
                if (person.warns.length >= 50) return undefined;
                return (await warnsDB.findOneAndUpdate(
                    {
                        _id: this.guild.id,
                        warnlist: {
                            $elemMatch: {
                                _id: member.id,
                            },
                        },
                    },
                    {
                        $push: {
                            'warnlist.$.warns': {
                                _id: warnid,
                                reason,
                                mod: mod.id,
                                severity,
                                date: new Date(),
                                expiration,
                            },
                        },
                    }
                )) as warnsData;
            } else {
                return warnsDB.findOneAndUpdate(
                    {
                        _id: this.guild.id,
                    },
                    {
                        $push: {
                            warnlist: {
                                _id: member.id,
                                warns: [
                                    {
                                        _id: warnid,
                                        reason,
                                        mod: mod.id,
                                        severity,
                                        date: new Date(),
                                        expiration,
                                    },
                                ],
                            },
                        },
                    },
                    {
                        upsert: true,
                    }
                );
            }
        }
        const data = await warnsDB.findOneAndUpdate(
            {
                _id: this.guild.id,
            },
            {
                $push: {
                    warnlist: {
                        _id: member.id,
                        warns: [
                            {
                                _id: warnid,
                                reason,
                                mod: mod.id,
                                severity,
                                date: new Date(),
                                expiration,
                            },
                        ],
                    },
                },
            },
            {
                upsert: true,
            }
        );
        return data as warnsData;
    }
    public async remove({
        warnid,
        member,
    }: {
        warnid: string;
        member: GuildMember;
    }) {
        const exist = await warnsDB.findOne({
            _id: this.guild.id,
        });
        if (exist as warnsData) {
            const person = exist?.warnlist.filter(
                (e) => e._id === member.id
            )?.[0];
            if (person) {
                if (person.warns.filter((e) => e._id === warnid).length) {
                    return (await warnsDB.findOneAndUpdate(
                        {
                            _id: this.guild.id,
                            warnlist: {
                                $elemMatch: {
                                    _id: member.id,
                                },
                            },
                        },
                        {
                            $pull: {
                                'warnlist.$.warns': {
                                    _id: warnid,
                                },
                            },
                        }
                    )) as warnsData;
                }
            }
        }
        return null;
    }
    public async get({
        member,
    }: {
        member: GuildMember;
    }): Promise<{ person: warnlist; exist: warnsData } | null> {
        const exist = await warnsDB.findOne({
            _id: this.guild.id,
        });
        if (exist as warnsData) {
            const person = exist?.warnlist.filter(
                (e) => e._id === member.id
            )?.[0];
            if (person) {
                return {
                    person,
                    exist,
                };
            }
        }
        return null;
    }
}
interface warns {
    _id: string;
    reason: string;
    mod: string;
    severity: number;
    date: Date;
    expiration: Date;
}
interface warnlist {
    _id: string;
    warns: warns[];
}
interface warnsData {
    _id: string;
    warnlist: warnlist[];
}
