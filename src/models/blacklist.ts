import { container } from '@sapphire/framework';
const blacklistSchema = new container.database.Schema(
    {
        _id: String,
        username: String,
        reason: String,
    },
    {
        timestamps: true,
    }
);

export default container.database.model(
    'blacklist',
    blacklistSchema,
    'blacklist'
);
