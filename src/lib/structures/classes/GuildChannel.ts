import { GuildChannel, NewsChannel, TextChannel, ThreadChannel } from 'discord.js';

TextChannel.prototype.visible = function visible(): boolean {
	return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
};

ThreadChannel.prototype.visible = function visible(): boolean {
	return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
};

NewsChannel.prototype.visible = function visible(): boolean {
	return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
};

GuildChannel.prototype.visible = function visible(): boolean {
	return this.permissionsFor(this.guild.roles.everyone).has('VIEW_CHANNEL');
};

declare module 'discord.js' {
	interface TextChannel {
		/**
		 * Checks if the channel is visible to the @everyone role or not.
		 * @author @EvolutionX-10
		 */
		visible: () => boolean;
	}
	interface ThreadChannel {
		visible: () => boolean;
	}
	interface NewsChannel {
		visible: () => boolean;
	}
	interface GuildChannel {
		/**
		 * Checks if the channel is visible to the @everyone role or not.
		 * @author @EvolutionX-10
		 */
		visible: () => boolean;
	}
}
