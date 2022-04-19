import { container } from '@sapphire/framework';
import pkg from '@typegoose/typegoose';
const { buildSchema, modelOptions, prop } = pkg;

@modelOptions({ schemaOptions: { timestamps: true } })
class modesClass {
	@prop({ default: false })
	public ownerMode!: boolean;
}
const schema = buildSchema(modesClass);
export default container.database.model('modes', schema, 'modes');
