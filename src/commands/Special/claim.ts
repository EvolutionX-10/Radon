import { Emojis } from '#constants';
import { Button, Embed, RadonCommand, Row } from '#lib/structures';
import { isAdmin, isModerator, sec } from '#lib/utility';
import { ApplyOptions } from '@sapphire/decorators';
import { RegisterBehavior } from '@sapphire/framework';
import { ButtonStyle, InteractionContextType, MessageFlags, type User } from 'discord.js';

@ApplyOptions<RadonCommand.Options>({
	description: 'Claim coupons for Solo Leveling Arise',
	cooldownDelay: sec(10),
	cooldownLimit: 2
})
export class UserCommand extends RadonCommand {
	readonly #AuthorityIds: string[] = [
		'1320010402557464616', // Guild Master
		'1320010453757202474' // Vice Guild Master
	];

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
			case 'post':
				return this.post(interaction);
			case 'solo':
				return this.solo(interaction);
		}
	}

	/**
	 * Static method to claim a coupon code
	 * @param code - The coupon code to claim
	 * @param memberCode - The member code to use for claiming
	 * @param user - The user claiming the coupon
	 * @param container - The Sapphire container
	 * @returns Claim result with success status and message
	 */
	public static async claimCoupon(code: string, memberCode: string, user: User, container: RadonCommand['container']): Promise<ClaimResult> {
		const logChannel = await container.client.channels.fetch('1441261253149331677');

		try {
			// Claim via POST request
			const payload = {
				gameCode: 'sololv',
				couponCode: code,
				langCd: 'EN_US',
				pid: memberCode
			};

			const postResponse = await fetch('https://coupon.netmarble.com/api/coupon', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});
			const postData = (await postResponse.json()) as PostCouponApiResponse;

			console.log(`[Debug] POST Coupon claim for code ${code}:`, postData);
			if (logChannel?.isTextBased() && logChannel.isSendable()) {
				logChannel.send(
					`POST Coupon claim for code \`${code}\` by ${user.tag}:\n\`\`\`json\n${JSON.stringify(postData, null, 2)}\n\`\`\`\n-# PID: ${memberCode}`
				);
			}

			// Check success
			if (postData.errorCode === 200 && postData.success === true) {
				return {
					success: true,
					message: 'Coupon claimed successfully'
				};
			} else {
				let failMessage = postData.errorMessage || postData.errorCause || 'Unknown error occurred';

				if (failMessage === '해당 쿠폰의 교환 횟수를 초과하였습니다.') {
					failMessage = 'You have exceeded the number of exchanges for this coupon.';
				} else if (failMessage === '이미 쿠폰을 사용하였거나, 유효기간이 지난 쿠폰입니다. 쿠폰을 다시 확인한 후 입력해 주세요') {
					failMessage = 'You have already used this coupon or it has expired. Please check the coupon and enter it again.';
				}

				return {
					success: false,
					message: failMessage,
					errorCode: postData.errorCode
				};
			}
		} catch (error) {
			console.error('[Error] Coupon claim error:', error);
			return {
				success: false,
				message: 'Network error occurred'
			};
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
					)
					.addSubcommand((builder) =>
						builder //
							.setName('post')
							.setDescription('Post a coupon code for others to claim')
							.addStringOption((option) =>
								option //
									.setName('code')
									.setDescription('The coupon code to post')
									.setRequired(true)
							)
					)
					.addSubcommand((builder) =>
						builder //
							.setName('solo')
							.setDescription('Claim a coupon with a specific member code')
							.addStringOption((option) =>
								option //
									.setName('member_code')
									.setDescription('Your Solo Leveling member code')
									.setRequired(true)
							)
							.addStringOption((option) =>
								option //
									.setName('coupon_code')
									.setDescription('The coupon code to claim')
									.setRequired(true)
							)
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
				const result = await UserCommand.claimCoupon(couponCode, memberCode, interaction.user, this.container);
				results.push({
					memberCode,
					success: result.success,
					message: result.message,
					errorCode: result.errorCode
				});
			}

			// Build response message
			const successCount = results.filter((r) => r.success).length;
			const failCount = results.filter((r) => !r.success).length;

			let content = '';

			// Only show success if there are successful claims
			if (successCount > 0) {
				content += `${Emojis.Confirm} Claimed in **${successCount}** account(s)\n`;
			}

			// Show failures
			if (failCount > 0) {
				if (successCount > 0) content += '\n';
				content += `${Emojis.Cross} Failed in **${failCount}** account(s)\n`;
				const failedResults = results.filter((r) => !r.success);
				for (const result of failedResults) {
					content += `- \`${result.memberCode.slice(0, 4)}...${result.memberCode.slice(-4)}\`: ${result.message}\n`;
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

	private async post(interaction: RadonCommand.ChatInputCommandInteraction) {
		const possibleRoles = interaction.member.roles.cache.filter((role) => this.#AuthorityIds.includes(role.id));
		if (!possibleRoles.size && !isModerator(interaction.member) && !isAdmin(interaction.member))
			return interaction.reply({ content: 'You do not have the required permissions to use this command!' });

		const code = interaction.options.getString('code', true);
		const userData = await this.container.prisma.memberCodes.findUnique({
			where: { id: interaction.user.id }
		});
		const dummyPID = userData?.memberCodes[0] || 'EDC9B7A5D68B4F0B9E7293500507E850';

		await interaction.deferReply();

		try {
			// Get coupon info
			const getUrl = new URL('https://coupon.netmarble.com/api/coupon/reward');
			getUrl.searchParams.append('gameCode', 'sololv');
			getUrl.searchParams.append('couponCode', code);
			getUrl.searchParams.append('langCd', 'EN_US');
			getUrl.searchParams.append('pid', dummyPID); // Dummy PID to get coupon info

			const response = await fetch(getUrl.toString());
			const couponInfo = (await response.json()) as GetCouponApiResponse;
			console.log(`[Debug] GET Coupon info for posting code ${code}:`, couponInfo);

			if (!couponInfo.resultData?.[0]?.productName) {
				return interaction.editReply({
					content: `${Emojis.Cross} Could not retrieve coupon information. Please check the code and try again.`
				});
			}

			const embed = new Embed()
				._color('Random')
				._title('🎁 New Coupon Available!')
				._description(couponInfo.resultData[0].productName || 'Coupon rewards available')
				._thumbnail(couponInfo.resultData[0].productImageUrl || '')
				._footer({ text: `Code: ${code}` })
				._timestamp();

			const claimButton = new Button()._customId(`code-${code}`)._label('Claim!')._style(ButtonStyle.Success);

			const row = new Row()._components(claimButton);

			return interaction.editReply({
				embeds: [embed],
				components: [row.toJSON()]
			});
		} catch (error) {
			this.container.logger.error('Error posting coupon:', error);
			return interaction.editReply({
				content: `${Emojis.Cross} An error occurred while posting the coupon. Please try again later.`
			});
		}
	}

	private async solo(interaction: RadonCommand.ChatInputCommandInteraction) {
		const memberCode = interaction.options.getString('member_code', true);
		const couponCode = interaction.options.getString('coupon_code', true);

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const result = await UserCommand.claimCoupon(couponCode, memberCode, interaction.user, this.container);

			if (result.success) {
				return interaction.editReply({
					content: `${Emojis.Confirm} ${result.message}!`
				});
			} else {
				return interaction.editReply({
					content: `${Emojis.Cross} Failed to claim coupon.\n\n**Reason:** ${result.message}`
				});
			}
		} catch (error) {
			this.container.logger.error('Error claiming coupon (solo):', error);
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

type Subcommands = 'set' | 'code' | 'delete' | 'view' | 'post' | 'solo';

interface CouponResult {
	memberCode: string;
	success: boolean;
	message: string;
	errorCode?: number;
}

interface ClaimResult {
	success: boolean;
	message: string;
	errorCode?: number;
}

// GET request response (for coupon info)
interface GetCouponApiResponse {
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

// POST request response (for claiming)
interface PostCouponApiResponse {
	errorCode: number;
	errorMessage?: string;
	errorCause?: string | null;
	httpStatus?: number;
	success?: boolean;
	resultData?: Array<{
		quantity: number;
	}>;
}
