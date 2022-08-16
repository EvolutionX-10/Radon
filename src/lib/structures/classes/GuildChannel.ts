import { GuildChannel, NewsChannel, TextChannel, ThreadChannel } from 'discord.js';

Object.defineProperty(TextChannel.prototype, 'visible', {
	get() {
		return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
	}
});

Object.defineProperty(NewsChannel.prototype, 'visible', {
	get() {
		return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
	}
});

Object.defineProperty(ThreadChannel.prototype, 'visible', {
	get() {
		return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
	}
});

Object.defineProperty(GuildChannel.prototype, 'visible', {
	get() {
		return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
	}
});

declare module 'discord.js' {
	interface TextChannel {
		/**
		 * Checks if the channel is visible to the @everyone role or not.
		 * @author @EvolutionX-10
		 */
		visible: boolean;
	}
	interface ThreadChannel {
		visible: boolean;
	}
	interface NewsChannel {
		visible: boolean;
	}
	interface GuildChannel {
		/**
		 * Checks if the channel is visible to the @everyone role or not.
		 * @author @EvolutionX-10
		 */
		visible: boolean;
	}
}
