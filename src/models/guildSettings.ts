import { buildSchema, modelOptions, prop } from '@typegoose/typegoose';
import { container } from '@sapphire/framework';
@modelOptions({ schemaOptions: { timestamps: true } })
class guildSettings {
    @prop({ required: true })
    public _id!: string;
    @prop({ default: false, required: false })
    public configured?: boolean;
    @prop({ required: false })
    public adminRoles?: string[];
    @prop({ required: false })
    public modRoles?: string[];
    @prop({ required: false })
    public modLogChannel?: string;
    @prop({ required: true })
    public isCommunity!: boolean;
}
const schema = buildSchema(guildSettings);
export default container.database.model(
    'guildSettings',
    schema,
    'guildSettings'
);
