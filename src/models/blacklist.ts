import { buildSchema, modelOptions, prop } from '@typegoose/typegoose';
import { container } from '@sapphire/framework';
@modelOptions({ schemaOptions: { timestamps: true } })
class blacklist {
	@prop({ required: true })
	public _id!: string;
	@prop({ required: true })
	public reason!: string;
}
const schema = buildSchema(blacklist);
export default container.database.model('blacklist', schema, 'blacklist');
