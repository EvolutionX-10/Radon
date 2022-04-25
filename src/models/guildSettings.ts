import pkg from '@typegoose/typegoose';
const { buildSchema, modelOptions, prop, Severity } = pkg;
import { container } from '@sapphire/framework';
@modelOptions({
	schemaOptions: { timestamps: true },
	options: { allowMixed: Severity.ALLOW }
})
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
export default container.database.model('guildSettings', schema, 'guildSettings');
