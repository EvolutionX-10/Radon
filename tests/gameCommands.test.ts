import { displayText } from './fixtures/presentation.js';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { container } from '@sapphire/framework';
import { SlashCommandBuilder, ApplicationCommandOptionType, MessageFlags } from 'discord.js';
import { UserCommand as ClaimCommand } from '../src/commands/Special/claim.js';
import { ButtonHandler } from '../src/interaction-handlers/buttons/claimCoupon.js';
import { ModalHandler } from '../src/interaction-handlers/modals/memberCodeInput.js';
import { runClaims } from '../src/lib/redemption/runtime.js';

const originalPrisma = container.prisma;
const originalClient = container.client;
afterEach(() => {
	container.prisma = originalPrisma;
	container.client = originalClient;
});

function fixture(game?: string, saved: string[] = ['A'.repeat(32)]) {
	const lookups: string[] = [];
	const replies: any[] = [];
	let form: any;
	const prisma = {
		memberCodes: {
			findUnique: async ({ where }: any) => {
				lookups.push(where.id);
				return { memberCodes: saved };
			}
		},
		redemptionReceipt: { findUnique: async () => null, create: async () => ({}) },
		supporterPass: { findMany: async () => [] },
		$runCommandRaw: async () => ({ ok: 1 })
	};
	container.prisma = prisma as any;
	container.client = { emit: () => true } as any;
	const interaction = {
		user: { id: '123', tag: 'test', displayAvatarURL: () => 'https://example.com/avatar.png' },
		options: { getSubcommand: () => 'code', getString: (name: string) => (name === 'game' ? (game ?? null) : 'CODE') },
		guildId: 'guild',
		guild: { name: 'Guild' },
		channelId: 'channel',
		channel: { name: 'coupons' },
		deferReply: async (options: any) => {
			expect(options.flags).toBe(MessageFlags.Ephemeral);
		},
		editReply: async (reply: any) => {
			replies.push(reply);
		},
		showModal: async (modal: any) => {
			form = modal.toJSON();
		}
	};
	return { prisma, interaction, lookups, replies, form: () => form };
}

describe('live-user claim paths', () => {
	it('registers the original flat commands with an optional game and no extra group', () => {
		let data: any;
		ClaimCommand.prototype.registerApplicationCommands.call(
			{ name: 'claim', description: 'Coupons' } as any,
			{
				registerChatInputCommand: (build: any) => {
					data = build(new SlashCommandBuilder()).toJSON();
				}
			} as any
		);
		expect(data.options.every((option: any) => option.type === ApplicationCommandOptionType.Subcommand)).toBe(true);
		for (const route of ['set', 'code', 'solo', 'delete', 'view', 'post']) {
			const option = data.options.find((option: any) => option.name === route).options.find((option: any) => option.name === 'game');
			expect(option.required ?? false).toBe(false);
		}
		expect(data.options.find((option: any) => option.name === 'post').options.find((option: any) => option.name === 'code').required).toBe(true);
	});
	it('old /claim code still uses the original account document, one publisher POST, and no voting API', async () => {
		const f = fixture();
		const requests: string[] = [];
		const fetcher = spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
			requests.push(String(url));
			expect(JSON.parse(String(init?.body)).gameCode).toBe('sololv');
			return Response.json({ success: true, errorCode: 200 });
		});
		try {
			await ClaimCommand.prototype.chatInputRun.call({ container: { prisma: f.prisma } } as any, f.interaction as any);
			expect(f.lookups).toEqual(['123']);
			expect(requests).toEqual(['https://coupon.netmarble.com/api/coupon']);
			expect(displayText(f.replies.at(-1))).toContain('Claimed in **1**');
		} finally {
			fetcher.mockRestore();
		}
	});
	it('a new-game posted button claims directly and automatically chooses the correct accounts', async () => {
		const f = fixture();
		const fetcher = spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
			expect(JSON.parse(String(init?.body)).gameCode).toBe('tskgb');
			return Response.json({ success: true, errorCode: 200 });
		});
		try {
			await ButtonHandler.prototype.run.call({ container: { prisma: f.prisma } } as any, f.interaction as any, {
				game: 'tskgb',
				code: 'CODE',
				expired: false
			});
			expect(f.lookups).toEqual(['game:tskgb:123']);
			expect(f.form()).toBeUndefined();
			expect(displayText(f.replies.at(-1))).toContain('Claimed in **1**');
		} finally {
			fetcher.mockRestore();
		}
	});
	it('first-time new-game claims open one setup form with bounded game-specific custom IDs', async () => {
		const f = fixture(undefined, []);
		const code = 'A'.repeat(64);
		await ButtonHandler.prototype.run.call({ container: { prisma: f.prisma } } as any, f.interaction as any, {
			game: 'nanarise',
			code,
			expired: false,
			expiresAt: Date.now() + 60_000
		});
		expect(f.form().custom_id.length).toBeLessThanOrEqual(100);
		expect(f.form().custom_id).toContain('claim-game/nanarise/');
		const parsed = ModalHandler.prototype.parse.call(
			{ some: (value: any) => value, none: () => null } as any,
			{ customId: f.form().custom_id, fields: { getTextInputValue: () => 'member123' } } as any
		) as any;
		expect(parsed.game).toBe('nanarise');
		expect(parsed.code).toBe(code);
		expect(parsed.memberCode).toBe('member123');
	});
	it('five healthy saved-account redemptions retain the under-five-second target with publisher throttling', async () => {
		const f = fixture(
			undefined,
			Array.from({ length: 5 }, (_, index) => String(index).padStart(32, 'A'))
		);
		const fetcher = spyOn(globalThis, 'fetch').mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			return Response.json({ success: true, errorCode: 200 });
		});
		try {
			const start = performance.now();
			await runClaims(
				f.interaction as any,
				'CODE',
				Array.from({ length: 5 }, (_, index) => String(index).padStart(32, 'A'))
			);
			expect(performance.now() - start).toBeLessThan(5_000);
			expect(displayText(f.replies.at(-1))).toContain('Claimed in **5**');
		} finally {
			fetcher.mockRestore();
		}
	}, 10_000);
	it('a delayed status edit finishes before the final claim result, so it cannot overwrite success', async () => {
		const f = fixture();
		f.interaction.editReply = async (reply: any) => {
			if (displayText(reply).includes('Still processing')) await new Promise((resolve) => setTimeout(resolve, 150));
			f.replies.push(reply);
		};
		const fetcher = spyOn(globalThis, 'fetch').mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 4_050));
			return Response.json({ success: true, errorCode: 200 });
		});
		try {
			await runClaims(f.interaction as any, 'CODE', ['A'.repeat(32)]);
			expect(displayText(f.replies[0])).toContain('Still processing');
			expect(displayText(f.replies.at(-1))).toContain('Claimed in **1**');
		} finally {
			fetcher.mockRestore();
		}
	}, 10_000);
});
