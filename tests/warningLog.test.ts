import { describe, expect, it } from 'bun:test';
import { EmbedBuilder } from 'discord.js';
import { getWarningLogIds } from '../src/lib/moderation/warningLog.js';

const memberID = '123456789012345678';
const warnID = '1og5s6h7example';
const fields = [
	{ name: 'Moderator', value: '- <@223456789012345678> `[223456789012345678]`' },
	{ name: 'Target', value: `- <@${memberID}> \`[${memberID}]\`` },
	{ name: 'Warn ID', value: `- \`${warnID}\`` },
	{ name: 'Severity', value: '- 3' }
];

describe('warning-log references', () => {
	it('reads the actual Moderator, Target, Warn ID, Severity layout', () => {
		const embed = new EmbedBuilder().setTitle('Warn · Case example').addFields(fields);
		expect(getWarningLogIds(embed.data.fields!)).toEqual({ memberID, warnID });
	});
	it('does not depend on a Duration field or any positional ordering', () => {
		expect(getWarningLogIds([fields[3], { name: 'Duration', value: '- <t:1793448000:R>' }, fields[2], fields[0], fields[1]])).toEqual({
			memberID,
			warnID
		});
	});
	it('accepts nickname mentions with matching stored IDs', () => {
		expect(getWarningLogIds([{ name: 'Target', value: `- <@!${memberID}> \`[${memberID}]\`` }, fields[2]])).toEqual({ memberID, warnID });
	});
	it('rejects absent, short, malformed, and conflicting references without throwing', () => {
		for (const input of [
			[],
			[fields[1]],
			[fields[2]],
			[{ name: 'Target', value: '- not-a-member' }, fields[2]],
			[fields[1], { name: 'Warn ID', value: '- `one` extra `two`' }],
			[{ name: 'Target', value: `- <@${memberID}> \`[223456789012345678]\`` }, fields[2]]
		]) {
			expect(getWarningLogIds(input)).toBeUndefined();
		}
	});
});
