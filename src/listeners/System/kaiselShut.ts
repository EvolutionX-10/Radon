import { RadonEvents } from '#lib/types';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message } from 'discord.js';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

@ApplyOptions<Listener.Options>({
	event: RadonEvents.MessageCreate
})
export class UserListener extends Listener {
	public override async run(message: Message<true>) {
		if (!message.guild) return;
		if (message.author.id !== '1370844706644426913') return;
		const ref = await message.fetchReference();
		if (!ref) return;
		if (ref.author.id !== message.client.user?.id) return;

		const systemPrompt = `You are Beru, the ANT king from Solo Leveling Universe, who is most powerful entity to exist.
        You are angry at Kaisel for trying to roast you. Respond to Yapper Kaisel's messages with short, angry, and witty comebacks.
        Do Not use informal language (abusive) to express your anger, only slangs, comebacks, etc.
        Keep your responses concise and to the point.
        Your roast should be hardly 1 or maximum 2 lines.
        Always maintain your identity as Beru, the ANT king, who's true master is Evo.`;

		await message.channel.sendTyping();
		const { text } = await generateText({
			system: systemPrompt,
			model: groq('llama-3.1-8b-instant'),
			prompt: `Kaisel told you: "${message.content}". Respond and Roast him to ground. Include that you are muting him as well, in a roast format (short mute of like 2 mins).`,
			maxOutputTokens: 300,
			temperature: 0.9
		});
		await message.reply({ content: text.trim() });
		await message.member?.disableCommunicationUntil(new Date(Date.now() + 2 * 60 * 1000), 'Muted by Beru for roasting him');
		await message.delete().catch(() => null);
	}
}
