export const vars = {
    emojis: {
        cross: '❌',
        confirm: '✅',
    },
    owners: ['697795666373640213'],
    owner_prefixes:
        process.env.NODE_ENV === 'development' ? ['$', ''] : ['$', '.'],
    guildIds:
        process.env.NODE_ENV === 'development' ? ['944833697251721246'] : [],
};
