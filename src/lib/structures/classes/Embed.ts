import { ColorResolvable, EmbedAuthorData, EmbedFooterData, EmbedBuilder, APIEmbedField, RestOrArray } from 'discord.js';

export class Embed extends EmbedBuilder {
	/**
	 * Fields
	 * @param fields The fields to add to the embed
	 * @returns Embed
	 */
	public _fields(...fields: RestOrArray<APIEmbedField>) {
		return this.addFields(...fields);
	}

	/**
	 * Field
	 * @param field The fields to add to the embed
	 * @returns Embed
	 */
	public _field(field: APIEmbedField) {
		return this.addFields([field]);
	}

	/**
	 * Color
	 * @param color The color of the embed
	 * @returns Embed
	 */
	public _color(color: ColorResolvable) {
		return this.setColor(color);
	}

	/**
	 * Author
	 * @param obj The author object
	 * @returns Embed
	 */
	public _author(obj: EmbedAuthorData) {
		return this.setAuthor(obj);
	}

	/**
	 * Footer
	 * @param obj The footer object
	 * @returns Embed
	 */
	public _footer(obj: EmbedFooterData) {
		return this.setFooter(obj);
	}

	/**
	 * Description
	 * @param str The description of the embed
	 * @returns Embed
	 */
	public _description(str: string) {
		return this.setDescription(str);
	}

	/**
	 * Title
	 * @param str The title of the embed
	 * @returns Embed
	 */
	public _title(str: string) {
		return this.setTitle(str);
	}

	/**
	 * Thumbnail
	 * @param url The url of the thumbnail
	 * @returns Embed
	 */
	public _thumbnail(url?: string | null) {
		return this.setThumbnail(url ?? '');
	}

	/**
	 * Timestamp
	 * @param timestamp The timestamp of the embed
	 * @returns Embed
	 */
	public _timestamp(timestamp?: Date | number) {
		return this.setTimestamp(timestamp);
	}

	/**
	 * Title URL
	 * @param url The url of the title
	 * @returns Embed
	 */
	public _url(url: string) {
		return this.setURL(url);
	}

	/**
	 * Image
	 * @param url The url of the image
	 * @returns Embed
	 */
	public _image(url: string) {
		return this.setImage(url);
	}
}
