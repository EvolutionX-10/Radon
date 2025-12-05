import { type ColorResolvable, type EmbedAuthorData, type EmbedFooterData, EmbedBuilder, type APIEmbedField, type RestOrArray } from 'discord.js';

export class Embed extends EmbedBuilder {
	/**
	 * Fields
	 * @param fields The fields to add to the embed
	 * @returns Embed
	 */
	public _fields(fields: RestOrArray<APIEmbedField>, set = false) {
		return set ? this.setFields(...fields) : this.addFields(...fields);
	}

	/**
	 * Field
	 * @param field The fields to add to the embed
	 * @returns Embed
	 */
	public _field(field: APIEmbedField) {
		return this.addFields(field);
	}

	/**
	 * Color
	 * @param color The color of the embed
	 * @returns Embed
	 */
	public _color(color: ColorResolvable | null) {
		return this.setColor(color);
	}

	/**
	 * Author
	 * @param obj The author object
	 * @returns Embed
	 */
	public _author(obj: EmbedAuthorData | null) {
		return this.setAuthor(obj);
	}

	/**
	 * Footer
	 * @param obj The footer object
	 * @returns Embed
	 */
	public _footer(obj: EmbedFooterData | null) {
		return this.setFooter(obj);
	}

	/**
	 * Description
	 * @param str The description of the embed
	 * @returns Embed
	 */
	public _description(str: string | null) {
		if (typeof str === 'string' && str.length === 0) str = null;
		if (typeof str === 'string' && str.length > 4096) {
			str = str.slice(0, 4093) + '...';
		}
		return this.setDescription(str);
	}

	/**
	 * Title
	 * @param str The title of the embed
	 * @returns Embed
	 */
	public _title(str: string | null) {
		return this.setTitle(str);
	}

	/**
	 * Thumbnail
	 * @param url The url of the thumbnail
	 * @returns Embed
	 */
	public _thumbnail(url: string | null) {
		return this.setThumbnail(url);
	}

	/**
	 * Timestamp
	 * @param timestamp The timestamp of the embed
	 * @returns Embed
	 */
	public _timestamp(timestamp?: Date | number | null | undefined) {
		return this.setTimestamp(timestamp);
	}

	/**
	 * Title URL
	 * @param url The url of the title
	 * @returns Embed
	 */
	public _url(url: string | null) {
		return this.setURL(url);
	}

	/**
	 * Image
	 * @param url The url of the image
	 * @returns Embed
	 */
	public _image(url: string | null) {
		return this.setImage(url);
	}
}
