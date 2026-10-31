import { RedemptionError } from './service.js';

export const games = [
	{ id: 'sololv', name: 'Solo Leveling: ARISE', minLength: 30, maxLength: 36 },
	{ id: 'tskgb', name: 'Seven Knights Re:BIRTH', minLength: 1, maxLength: 64 },
	{ id: 'nanarise', name: 'The Seven Deadly Sins: Idle Adventure', minLength: 1, maxLength: 64 }
] as const;
export type GameId = (typeof games)[number]['id'];
export function getGame(id: string = 'sololv') {
	const game = games.find((entry) => entry.id === id);
	if (!game) throw new RedemptionError('Choose a supported game. Use `/guide` for help.');
	return game;
}
/** Preserve every existing Solo Leveling document and account label in place. */
export function accountOwnerKey(userId: string, game: string = 'sololv') {
	return getGame(game).id === 'sololv' ? userId : `game:${game}:${userId}`;
}
