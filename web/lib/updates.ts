// Static public release notes shared with /updates in Discord. No bot runtime imports.
import updates from '../../shared/updates.json';

export { updates };

export function updateDate(date: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
