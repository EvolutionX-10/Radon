import { container } from '@sapphire/framework';
import pkg from '@typegoose/typegoose';
const { buildSchema, modelOptions, prop, Severity } = pkg;

class warns {
	@prop({ required: true })
	public _id!: string; // ? warn id

	@prop({ required: true })
	public reason!: string;

	@prop({ required: true })
	public mod!: string;

	@prop({ required: true })
	public severity!: number;

	@prop({ required: true })
	public date!: Date;

	@prop({ required: true })
	public expiration!: Date;
}

class warnlist {
	@prop({ required: true })
	public _id!: string; // ? user id

	@prop({ required: true })
	public warns!: [warns];
}
@modelOptions({
	schemaOptions: { timestamps: true },
	options: { allowMixed: Severity.ALLOW }
})
class guildWarns {
	@prop({ required: true })
	public _id!: string; // ? guild id

	@prop({ required: true })
	public warnlist!: [warnlist];
}

const schema = buildSchema(guildWarns);
export default container.database.model('guildWarns', schema, 'guildWarns');
