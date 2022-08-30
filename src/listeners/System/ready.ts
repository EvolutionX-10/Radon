import type { RadonClient } from '#lib/RadonClient';
import { GuildSettings, Settings, Utils } from '#lib/structures';
import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Piece, Store } from '@sapphire/framework';
import { blue, blueBright, cyanBright, green, greenBright, magentaBright, white } from 'colorette';
import gradient from 'gradient-string';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.ClientReady,
	once: true
})
export class UserListener extends Listener {
	public override run(client: RadonClient) {
		this.container.settings = new Settings();
		this.container.utils = new Utils(client);

		this.container.client = client;
		this.container.logger.info(`Logged in as ${gradient.fruit(client.user!.username)}`);
		this.printBanner();
		this.container.logger.info(`${greenBright('[')}${blueBright('READY')}${greenBright(']')}`);

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
		const blc = this.isDev ? cyanBright : blue;

		console.log(
			gradient.pastel(
				[
					'',
					String.raw`_///////                _//                  `,
					String.raw`_//    _//              _//                  `,
					String.raw`_//    _//   _//        _//   _//   _// _//  `,
					String.raw`_/ _//     _//  _// _// _// _//  _// _//  _//`,
					String.raw`_//  _//  _//   _//_/   _//_//    _//_//  _//`,
					String.raw`_//    _//_//   _//_/   _// _//  _// _//  _//`,
					String.raw`_//      _//_// _///_// _//   _//   _///  _//`,
					String.raw`                                             `
				]
					.concat(this.printStoreDebugInformation())
					.join('\n')
			)
		);

		// Offset Pad
		const pad = ' '.repeat(2);

		console.log(
			String.raw`
${pad + pad}[${success}] Gateway
${this.isDev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client } = this.container;
		const stores = [...client.stores.values()] as Store<Piece>[];
		const offset = ' '.repeat(4);
		const extra: string[] = [''];

		for (const store of stores) extra.push(offset.concat(this.styleStore(store)));
		return extra.concat('');
	}

	private styleStore<T extends Piece>(store: Store<T>) {
		return `Loaded ${store.size.toString().padEnd(3, ' ')} ${store.name}.`;
	}
}
