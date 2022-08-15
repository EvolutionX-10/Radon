import type { RadonClient } from '#lib/RadonClient';
import { GuildSettings, Settings, Utils } from '#lib/structures';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Piece, Store } from '@sapphire/framework';
import { blue, gray, green, magentaBright, white, yellow, greenBright, blueBright, cyanBright } from 'colorette';
import gradient from 'gradient-string';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady,
	once: true
})
export class UserListener extends Listener {
	private readonly style = this.isDev ? yellow : blue;

	public override run(client: RadonClient) {
		this.container.settings = new Settings();
		this.container.utils = new Utils(client);

		this.container.client = client;
		this.container.logger.info(`Logged in as ${gradient.pastel(client.user!.username!)} ${cyanBright(`[${process.env.npm_package_version}]`)}`);
		this.printBanner();
		this.printStoreDebugInformation();
		this.container.logger.info(`${greenBright('ws            [')}${blueBright('READY')}${greenBright(']')}`);

		const guilds = client.guilds.cache;
		for (const guild of guilds.values()) {
			guild.settings = new GuildSettings(guild);
		}
	}

	private get isDev() {
		return process.env.NODE_ENV === 'development';
	}

	private printBanner() {
		const success = green('+');

		const llc = this.isDev ? magentaBright : white;
		const blc = this.isDev ? blueBright : blue;

		// Offset Pad
		const pad = '  ';

		console.log(
			String.raw`
${pad}[${success}] Gateway
${this.isDev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()] as Store<Piece>[];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore<T extends Piece>(store: Store<T>, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}
}
