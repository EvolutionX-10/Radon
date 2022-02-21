import { container } from '@sapphire/framework';
const prefixSchema = new container.database.Schema(
    {
        _id: {
            type: String,
            required: true,
        },
        prefix: {
            type: String,
            default: '$',
        },
        ownerPrefix: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);
export default container.database.model('prefix', prefixSchema, 'prefix');
