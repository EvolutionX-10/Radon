import { container } from '@sapphire/framework';

const modesSchema = new container.database.Schema(
    {
        ownerMode: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export default container.database.model('modes', modesSchema, 'modes');
