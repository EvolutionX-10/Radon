import { describe, expect, it, mock } from 'bun:test';
import { ApplicationCommandOptionType, ApplicationCommandType, Collection } from 'discord.js';
import { mention, mentionCommand } from '#lib/utility/functions/mention.js';

describe('command references', () => {
	it('uses the root application command ID for nested slash command links', async () => {
		const client = {
			application: {
				fetch: mock(async () => ({
					commands: { fetch: async () => new Collection([['claim-id', { name: 'claim', id: 'claim-id' }]]) }
				}))
			}
		};
		expect(await mention('claim alerts', client as any)).toBe('</claim alerts:claim-id>');
		expect(await mention('retired-command', client as any)).toBe('/retired-command');
	});
	it('reports unavailable application commands instead of constructing an invalid mention', async () => {
		await expect(mention('help', {} as any)).rejects.toThrow('Failed to fetch commands');
		const fetch = mock(async () => {
			throw new Error('Discord unavailable');
		});
		await expect(mention('help', { application: { fetch } } as any)).rejects.toThrow('Discord unavailable');
	});
	it('renders context menus as readable names and flat slash commands as links', () => {
		expect(mentionCommand({ name: 'Report Message', type: ApplicationCommandType.Message } as any)).toBe('Report Message');
		expect(mentionCommand({ name: 'help', id: '1', type: ApplicationCommandType.ChatInput, options: [] } as any)).toBe('</help:1>');
	});
	it('lists grouped and direct routes without exposing ordinary options as commands', () => {
		const command = {
			name: 'moderate',
			id: '2',
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: 'case',
					type: ApplicationCommandOptionType.SubcommandGroup,
					options: [
						{ name: 'view', type: ApplicationCommandOptionType.Subcommand },
						{ name: 'reason', type: ApplicationCommandOptionType.Subcommand },
						{ name: 'id', type: ApplicationCommandOptionType.String }
					]
				},
				{ name: 'empty-group', type: ApplicationCommandOptionType.SubcommandGroup },
				{ name: 'warn', type: ApplicationCommandOptionType.Subcommand },
				{ name: 'target', type: ApplicationCommandOptionType.User }
			]
		};
		expect(mentionCommand(command as any)).toBe('</moderate case view:2>\n</moderate case reason:2>\n</moderate warn:2>');
	});
});
