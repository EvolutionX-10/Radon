import { Button, RadonCommand } from '#lib/structures';
import type { MessageButton } from 'discord.js';

export class UserCommand extends RadonCommand {
	#ids = Array(25)
		.fill(0)
		.map((_, i) => i);

	public override async messageRun(message: RadonCommand.Message) {
		const m = await message.channel.send({ content: 'Here you go', components: this.gimmeButtons(true) });
		let j = 1;
		let picked = await this.showOrder(m, j);
		const collector = m.createMessageComponentCollector({
			filter: (b) => b.user.id === message.author.id,
			time: 30000,
			componentType: 'BUTTON'
		});

		const selected: string[] = [];
		collector.on('collect', async (i) => {
			await i.deferUpdate();
			const ids = picked.map((b) => b.customId);
			selected.push(i.customId);

			while (selected.length < j) return;
			if (ids.toString() === selected.toString()) {
				if (selected.length === 25) {
					await m.edit(`You got it right!\n>Hard mode begins now!`);
					selected.length = 0;
					picked = await this.showOrder(m, 25);
					return collector.resetTimer();
				}
				await m.edit(`You got it right!\n> Your score: ${j}`);
				selected.length = 0;
				picked = await this.showOrder(m, ++j);
				return collector.resetTimer();
			}

			await this.wrong(m, i.customId);
		});

		collector.on('end', (_c) => {
			const { components } = m;
			components.forEach((c) => c.components.forEach((b) => b.setDisabled()));
			m.edit({ content: 'Time up!', components });
		});
	}

	private gimmeButtons(disable = false) {
		const row1 = this.container.utils.row()._components(this.makeButtons(0, disable));
		const row2 = this.container.utils.row()._components(this.makeButtons(1, disable));
		const row3 = this.container.utils.row()._components(this.makeButtons(2, disable));
		const row4 = this.container.utils.row()._components(this.makeButtons(3, disable));
		const row5 = this.container.utils.row()._components(this.makeButtons(4, disable));

		return [row1, row2, row3, row4, row5];
	}

	private makeButtons(i: number, disable = false) {
		const prop = this.#ids.slice(i * 5, i * 5 + 5);

		const colors = ['🔴', '🟠', '🟡', '🟢', '🟣', '🟤', '🟥', '🟦', '🟧', '🟨', '🟩', '🟪'];

		const emojis = Array(25)
			.fill(null)
			.map(() => this.container.utils.pickRandom(shuffle(colors)));
		const e = emojis.slice(i * 5, i * 5 + 5);
		const button1 = this.container.utils.button()._customId(`${prop[0]}`)._style('SECONDARY')._emoji(e[0])._disabled(disable);
		const button2 = this.container.utils.button()._customId(`${prop[1]}`)._style('SECONDARY')._emoji(e[1])._disabled(disable);
		const button3 = this.container.utils.button()._customId(`${prop[2]}`)._style('SECONDARY')._emoji(e[2])._disabled(disable);
		const button4 = this.container.utils.button()._customId(`${prop[3]}`)._style('SECONDARY')._emoji(e[3])._disabled(disable);
		const button5 = this.container.utils.button()._customId(`${prop[4]}`)._style('SECONDARY')._emoji(e[4])._disabled(disable);

		return [button1, button2, button3, button4, button5];
	}

	private async showOrder(message: RadonCommand.Message, i: number) {
		const { components } = message;
		components.forEach((c) => c.components.forEach((b) => b.setDisabled()));
		const buttons = components.flatMap((c) => c.components);
		const pick: Button[] = Array(i)
			.fill(null)
			.map((_) => this.container.utils.pickRandom(buttons));

		for await (const btn of pick) {
			await wait(50);
			components.forEach((c) => c.components.forEach((b) => (b.customId === btn.customId ? btn.setStyle('PRIMARY') : null)));
			await message.edit({ components });

			await wait(50);
			components.forEach((c) => c.components.forEach((_b) => btn.setStyle('SECONDARY')));
			await message.edit({ components });
		}

		await wait(300);
		components.forEach((c) => c.components.forEach((b) => b.setDisabled(false)));
		await message.edit({ components });
		return pick;
	}

	private async wrong(message: RadonCommand.Message, id: string) {
		const { components } = message;
		components.forEach((c) => c.components.forEach((b) => b.setDisabled()));
		const buttons = components.flatMap((c) => c.components);
		buttons.forEach((b) => (b.customId === id ? (b as MessageButton).setStyle('DANGER') : null));
		await message.edit({ content: message.content.replace('right', 'wrong'), components });
	}
}

function shuffle(array: Array<string>) {
	let currentIndex = array.length;
	let randomIndex;

	// While there remain elements to shuffle.
	while (currentIndex !== 0) {
		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}

	return array;
}

async function wait(ms: number) {
	const wait = (await import('node:util')).promisify(setTimeout);
	return wait(ms);
}
