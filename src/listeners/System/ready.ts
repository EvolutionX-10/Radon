/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RadonClient } from '#lib/RadonClient';
import { GuildSettings, Settings, Utils } from '#lib/structures';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, Store } from '@sapphire/framework';
import { blue, gray, green, magentaBright, white, yellow, greenBright, blueBright } from 'colorette';
import figlet from 'figlet';
import gradient from 'gradient-string';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import { version } from '../../../package.json';
@ApplyOptions<Listener.Options>({
	event: Events.ClientReady,
	once: true
})
export class UserListener extends Listener {
	private readonly style = this.isDev ? yellow : blue;
	public override async run(client: RadonClient) {
		this.container.settings = new Settings();
		this.container.utils = new Utils();
		await client.guilds.fetch();
		this.container.client = client;
		this.container.logger.info(`Logged in as ${greenBright(client.user?.tag as string)}`);
		this.printBanner();
		this.printStoreDebugInformation();
		this.container.logger.info(`${greenBright('ws            [')}${blueBright('READY')}${greenBright(']')}`);
		const guilds = client.guilds.cache;
		guilds.forEach((guild) => (guild.settings = new GuildSettings(guild)));
		if (process.env.NODE_ENV === 'production') await this.postServerCount();
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
${gradient.pastel.multiline(figlet.textSync(this.container.client.user?.username ?? 'Err'))}
${pad}${blc(`${process.env.CLIENT_NAME} [${version}]`)}
${pad}[${success}] Gateway
${this.isDev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}
	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: Store<any>, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}

	private async postServerCount() {
		await axios({
			url: `https://api.voidbots.net/bot/stats/944833303226236989`,
			method: 'POST',
			headers: {
				Authorization: process.env.VOID_BOT_TOKEN as string,
				'Content-Type': 'application/json'
			},
			data: JSON.stringify({
				server_count: this.container.client.guilds.cache.size,
				shard_count: this.container.client.shard?.count ?? 0
			})
		});
		await axios({
			url: `https://top.gg/api/bots/944833303226236989/stats`,
			method: 'POST',
			headers: {
				Authorization: process.env.TOP_BOT_TOKEN as string,
				'Content-Type': 'application/json'
			},
			data: JSON.stringify({
				server_count: this.container.client.guilds.cache.size,
				shard_count: this.container.client.shard?.count ?? 0
			})
		});
	}
}
