import { container } from '@sapphire/framework';
import { buildSchema, modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
class modesClass {
    @prop({ default: false })
    public ownerMode!: boolean;
}
const schema = buildSchema(modesClass);
export default container.database.model('modes', schema, 'modes');
