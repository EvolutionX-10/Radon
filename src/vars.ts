export const vars = {
    emojis: {
        cross: '<:redCross:957909502911471636>',
        confirm: '<:greenTick:957909436477878302>',
    },
    owners: ['697795666373640213'],
    owner_prefixes:
        process.env.NODE_ENV === 'development' ? ['$', ''] : ['$', '.'],
    guildIds:
        process.env.NODE_ENV === 'development' ? ['944833697251721246'] : [],
};
