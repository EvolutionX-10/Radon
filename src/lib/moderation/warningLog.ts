export interface WarningLogIds {
	memberID: string;
	warnID: string;
}

/** Logs may gain optional fields; identify stored warning references by field names. */
export function getWarningLogIds(fields: readonly { name: string; value: string }[]): WarningLogIds | undefined {
	const target = fields.find((field) => field.name.trim().toLowerCase() === 'target')?.value;
	const warning = fields.find((field) => field.name.trim().toLowerCase() === 'warn id')?.value;
	if (!target || !warning) return undefined;
	const mentionId = /<@!?(\d{17,20})>/.exec(target)?.[1];
	const storedId = /`\[(\d{17,20})\]`/.exec(target)?.[1];
	if (mentionId && storedId && mentionId !== storedId) return undefined;
	const memberID = mentionId ?? storedId;
	const warnID = /^\s*(?:-\s*)?`?([a-zA-Z0-9_-]{1,64})`?\s*$/.exec(warning)?.[1];
	return memberID && warnID ? { memberID, warnID } : undefined;
}
