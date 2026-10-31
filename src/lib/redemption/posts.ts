import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { validateCoupon } from './service.js';
import { getGame } from './games.js';

export function claimButtonId(game: string, code: string, expiresAt = 0) {
	getGame(game);
	if (!validateCoupon(code) || !Number.isSafeInteger(expiresAt) || expiresAt < 0) throw new Error('Invalid coupon button');
	return game === 'sololv' ? `redeem:${expiresAt.toString(36)}:${code}` : `redeem:${game}:${expiresAt.toString(36)}:${code}`;
}

export function parseClaimButton(customId: string, now = Date.now()): { code: string; expired: boolean; game?: string; expiresAt?: number } | null {
	if (customId.startsWith('code-')) {
		const code = customId.slice(5);
		return validateCoupon(code) ? { code, expired: false } : null;
	}
	const multi = /^redeem:(tskgb|nanarise):([0-9a-z]+):([A-Za-z0-9_-]{1,64})$/.exec(customId);
	if (multi) {
		const expiresAt = Number.parseInt(multi[2], 36);
		if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) return null;
		return { game: multi[1], code: multi[3], expired: expiresAt !== 0 && now >= expiresAt, expiresAt };
	}
	const match = /^redeem:([0-9a-z]+):([A-Za-z0-9_-]{1,64})$/.exec(customId);
	if (!match) return null;
	const expiresAt = Number.parseInt(match[1], 36);
	if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) return null;
	return { code: match[2], expired: expiresAt !== 0 && now >= expiresAt };
}
export function disableClaimButtons<T>(components: T): T {
	const copy = structuredClone(components);
	function visit(value: unknown) {
		if (Array.isArray(value)) return value.forEach(visit);
		if (!value || typeof value !== 'object') return;
		if ('custom_id' in value && typeof value.custom_id === 'string' && parseClaimButton(value.custom_id))
			Object.assign(value, { disabled: true });
		for (const child of Object.values(value)) visit(child);
	}
	visit(copy);
	return copy;
}

export function canPostCoupon(member: Pick<GuildMember, 'permissions' | 'roles'>, postingRoleId?: string | null) {
	return member.permissions.has(PermissionFlagsBits.ManageMessages) || !!(postingRoleId && member.roles.cache.has(postingRoleId));
}
