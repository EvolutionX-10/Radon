import { Stopwatch } from '@sapphire/stopwatch';

/**
 * Static method to claim a coupon code
 * @param code - The coupon code to claim
 * @param memberCode - The member code to use for claiming
 * @returns Claim result
 */
export async function claimCoupon(code: string, memberCode: string): Promise<ClaimResult> {
	const stopwatch = new Stopwatch();
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
		}).catch(() => null);
		if (!postResponse) throw new Error('Fetch Failed...');
		const postData = (await postResponse.json()) as PostCouponApiResponse;

		// Check success
		if (postData.errorCode === 200 && postData.success === true) {
			return {
				success: true,
				message: 'Coupon claimed successfully',
				code,
				memberCode,
				apiResponse: postData,
				elapsedTime: stopwatch.stop().toString()
			};
		} else {
			let failMessage = postData.errorCause || postData.errorMessage || 'Unknown error occurred';

			if (failMessage === '해당 쿠폰의 교환 횟수를 초과하였습니다.') {
				failMessage = 'You have exceeded the number of exchanges for this coupon.';
			} else if (failMessage === '이미 쿠폰을 사용하였거나, 유효기간이 지난 쿠폰입니다. 쿠폰을 다시 확인한 후 입력해 주세요') {
				failMessage = 'You have already used this coupon or it has expired. Please check the coupon and enter it again.';
			} else if (failMessage === '잘못된 쿠폰 번호입니다. 쿠폰을 다시 확인한 후 입력해 주세요.') {
				failMessage = 'Invalid coupon code. Please check the coupon and enter it again.';
			}

			return {
				success: false,
				message: failMessage,
				code,
				memberCode,
				apiResponse: postData,
				elapsedTime: stopwatch.stop().toString()
			};
		}
	} catch (error) {
		console.error('[Error] Coupon claim error:', error);
		return {
			success: false,
			code,
			memberCode,
			message: 'Network error occurred',
			elapsedTime: stopwatch.stop().toString()
		};
	}
}

export interface CouponResult {
	memberCode: string;
	success: boolean;
	message: string;
	errorCode?: number;
}

export interface ClaimResult {
	success: boolean;
	message: string;
	code: string;
	memberCode: string;
	apiResponse?: PostCouponApiResponse;
	elapsedTime?: string;
}

// GET request response (for coupon info)
export interface GetCouponApiResponse {
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
export interface PostCouponApiResponse {
	errorCode: number;
	errorMessage?: string;
	errorCause?: string | null;
	httpStatus?: number;
	success?: boolean;
	resultData?: Array<{
		quantity: number;
	}>;
}
