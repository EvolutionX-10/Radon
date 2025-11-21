import { Emojis } from '#constants';
import { RadonCommand } from '#lib/structures';
import { sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { RegisterBehavior } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Claim coupons for Solo Leveling Arise',
	cooldownDelay: sec(10),
	cooldownLimit: 2
})
export class UserCommand extends RadonCommand {
	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const subcmd = interaction.options.getSubcommand();

		switch (subcmd as Subcommands) {
			case 'set':
				return this.set(interaction);
			case 'code':
				return this.code(interaction);
			case 'delete':
				return this.delete(interaction);
			case 'view':
				return this.view(interaction);
		}
	}

	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description)
					.setContexts([InteractionContextType.Guild])
					.addSubcommand((builder) =>
						builder //
							.setName('set')
							.setDescription('Set your member code for claiming coupons')
							.addStringOption((option) =>
								option //
									.setName('member_code')
									.setDescription('Your Solo Leveling member code')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('code')
							.setDescription('Claim a coupon code')
							.addStringOption((option) =>
								option //
									.setName('coupon_code')
									.setDescription('The coupon code to claim')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('delete')
							.setDescription('Delete a member code from your account')
							.addStringOption((option) =>
								option //
									.setName('member_code')
									.setDescription('The member code to delete')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('view')
							.setDescription('View your registered member codes')
					),
			{
				guildIds: ['1276602245689114725'],
				idHints: ['1441251701725073482', '1441251868583137330'],
				behaviorWhenNotIdentical: RegisterBehavior.Overwrite
			}
		);
	}

	private async set(interaction: RadonCommand.ChatInputCommandInteraction) {
		const memberCode = interaction.options.getString('member_code', true);
		const userId = interaction.user.id;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Get existing member codes for this user
			const existingData = await this.container.prisma.memberCodes.findUnique({
				where: { id: userId }
			});

			if (existingData) {
				// Check if user has reached the maximum limit
				if (existingData.memberCodes.length >= 5) {
					return interaction.editReply({
						content: `${Emojis.Cross} You have reached the maximum limit of 5 member codes! Please delete one before adding a new one.`
					});
				}

				// Check if the member code already exists
				if (existingData.memberCodes.includes(memberCode)) {
					return interaction.editReply({
						content: `${Emojis.Cross} This member code is already registered for your account!`
					});
				}

				// Add new member code to the array
				await this.container.prisma.memberCodes.update({
					where: { id: userId },
					data: {
						memberCodes: [...existingData.memberCodes, memberCode],
						updatedAt: new Date()
					}
				});

				return interaction.editReply({
					content: `${Emojis.Confirm} Successfully added member code! You now have ${existingData.memberCodes.length + 1}/5 member code(s) registered.`
				});
			} else {
				// Create new entry
				await this.container.prisma.memberCodes.create({
					data: {
						id: userId,
						memberCodes: [memberCode],
						createdAt: new Date(),
						updatedAt: new Date()
					}
				});

				return interaction.editReply({
					content: `${Emojis.Confirm} Successfully registered your first member code!`
				});
			}
		} catch (error) {
			this.container.logger.error('Error setting member code:', error);
			return interaction.editReply({
				content: `${Emojis.Cross} An error occurred while setting your member code. Please try again later.`
			});
		}
	}

	private async code(interaction: RadonCommand.ChatInputCommandInteraction) {
		const couponCode = interaction.options.getString('coupon_code', true);
		const userId = interaction.user.id;
		const logChannel = await this.container.client.channels.fetch('1441261253149331677');

		await interaction.deferReply();

		try {
			// Get member codes for this user
			const userData = await this.container.prisma.memberCodes.findUnique({
				where: { id: userId }
			});

			if (!userData || userData.memberCodes.length === 0) {
				return interaction.editReply({
					content: `${Emojis.Cross} You don't have any member codes registered! Please use \`/claim set\` to register your member code first.`
				});
			}

			const memberCodes = userData.memberCodes;
			const results: CouponResult[] = [];

			// Claim coupon for each member code
			for (const memberCode of memberCodes) {
				try {
					const url = new URL('https://coupon.netmarble.com/api/coupon/reward');
					url.searchParams.append('gameCode', 'sololv');
					url.searchParams.append('couponCode', couponCode);
					url.searchParams.append('langCd', 'EN_US');
					url.searchParams.append('pid', memberCode);

					const response = await fetch(url.toString());
					const data = (await response.json()) as CouponApiResponse;
					console.log(`[Debug] Coupon claim response for memberCode ${memberCode}:`, data);
					if (logChannel?.isTextBased() && logChannel.isSendable()) {
						logChannel.send(
							`Coupon claim attempt for memberCode \`${memberCode}\` by ${interaction.user.tag}: \`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
						);
					}

					// Success when errorCode is 200
					if (data.errorCode === 200 && data.success === true) {
						results.push({
							memberCode,
							success: true,
							message: 'Coupon claimed successfully'
						});
					} else {
						// Failed - use errorMessage or errorCause
						let failMessage = data.errorMessage || data.errorCause || 'Unknown error occurred';

						if (failMessage === '해당 쿠폰의 교환 횟수를 초과하였습니다.') {
							failMessage = 'You have exceeded the number of exchanges for this coupon.';
						} else if (failMessage === '이미 쿠폰을 사용하였거나, 유효기간이 지난 쿠폰입니다. 쿠폰을 다시 확인한 후 입력해 주세요') {
							failMessage = 'You have already used this coupon or it has expired. Please check the coupon and enter it again.';
						}

						results.push({
							memberCode,
							success: false,
							message: failMessage,
							errorCode: data.errorCode
						});
					}
				} catch (error) {
					results.push({
						memberCode,
						success: false,
						message: 'Network error occurred'
					});
				}
			}

			// Build response message
			const successCount = results.filter((r) => r.success).length;
			const failCount = results.filter((r) => !r.success).length;

			let content = `## Coupon Redemption Results\n\n`;
			content += `✅ **Claimed in ${successCount} account(s)**\n`;

			if (failCount > 0) {
				content += `❌ **Failed in ${failCount} account(s)**\n\n`;
				content += `### Failed Accounts:\n`;
				const failedResults = results.filter((r) => !r.success);
				for (const result of failedResults) {
					content += `- Member Code: \`${result.memberCode.slice(0, 4)}...${result.memberCode.slice(-4)}\`\n`;
					content += `  Reason: ${result.message}\n`;
				}
			}

			return interaction.editReply({ content });
		} catch (error) {
			this.container.logger.error('Error claiming coupon:', error);
			return interaction.editReply({
				content: `${Emojis.Cross} An error occurred while claiming the coupon. Please try again later.`
			});
		}
	}

	private async delete(interaction: RadonCommand.ChatInputCommandInteraction) {
		const memberCode = interaction.options.getString('member_code', true);
		const userId = interaction.user.id;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Get existing member codes for this user
			const existingData = await this.container.prisma.memberCodes.findUnique({
				where: { id: userId }
			});

			if (!existingData || existingData.memberCodes.length === 0) {
				return interaction.editReply({
					content: `${Emojis.Cross} You don't have any member codes registered!`
				});
			}

			// Check if the member code exists
			if (!existingData.memberCodes.includes(memberCode)) {
				return interaction.editReply({
					content: `${Emojis.Cross} This member code is not registered for your account!`
				});
			}

			// Remove the member code from the array
			const updatedCodes = existingData.memberCodes.filter((code) => code !== memberCode);

			if (updatedCodes.length === 0) {
				// Delete the entire document if no codes remain
				await this.container.prisma.memberCodes.delete({
					where: { id: userId }
				});

				return interaction.editReply({
					content: `${Emojis.Confirm} Successfully deleted your last member code! You now have no member codes registered.`
				});
			} else {
				// Update with remaining codes
				await this.container.prisma.memberCodes.update({
					where: { id: userId },
					data: {
						memberCodes: updatedCodes,
						updatedAt: new Date()
					}
				});

				return interaction.editReply({
					content: `${Emojis.Confirm} Successfully deleted member code! You now have ${updatedCodes.length} member code(s) registered.`
				});
			}
		} catch (error) {
			this.container.logger.error('Error deleting member code:', error);
			return interaction.editReply({
				content: `${Emojis.Cross} An error occurred while deleting your member code. Please try again later.`
			});
		}
	}

	private async view(interaction: RadonCommand.ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Get existing member codes for this user
			const existingData = await this.container.prisma.memberCodes.findUnique({
				where: { id: userId }
			});

			if (!existingData || existingData.memberCodes.length === 0) {
				return interaction.editReply({
					content: `${Emojis.Cross} You don't have any member codes registered!\n\nUse \`/claim set\` to add your first member code.`
				});
			}

			const codesList = existingData.memberCodes.map((code, index) => `${index + 1}. \`${code.slice(0, 4)}...${code.slice(-4)}\``).join('\n');

			const content = `## Your Registered Member Codes\n\n${codesList}\n\n**Total:** ${existingData.memberCodes.length}/5`;

			return interaction.editReply({ content });
		} catch (error) {
			this.container.logger.error('Error viewing member codes:', error);
			return interaction.editReply({
				content: `${Emojis.Cross} An error occurred while retrieving your member codes. Please try again later.`
			});
		}
	}
}

type Subcommands = 'set' | 'code' | 'delete' | 'view';

interface CouponResult {
	memberCode: string;
	success: boolean;
	message: string;
	errorCode?: number;
}

interface CouponApiResponse {
	errorCode: number;
	errorMessage?: string;
	errorCause?: string | null;
	httpStatus?: number;
	success?: boolean;
	rewardType?: string;
	resultData?: Array<{
		productName: string;
		productImageUrl: string;
		userSelectionRate: number;
	}>;
}
