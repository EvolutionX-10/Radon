import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shows supported games and the real Discord authorization link', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your server.A whole lotmore alive.');
	await expect(page.locator('.game-card')).toHaveCount(3);
	await expect(page.locator('.game-card')).toContainText(['Solo Leveling', 'Seven Knights', 'The Seven Deadly Sins']);
	const invite = new URL((await page.getByRole('link', { name: 'Add to Discord' }).first().getAttribute('href')) as string);
	expect(invite.host).toBe('discord.com');
	expect(invite.searchParams.get('client_id')).toBe('944833303226236989');
	expect(invite.searchParams.get('scope')).toBe('applications.commands bot');
	expect(errors).toEqual([]);
});

test('interactive preview claims only a demo and changes content', async ({ page }) => {
	const externalRequests: string[] = [];
	page.on('request', (request) => {
		if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(request.url());
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Try the CLAIM button' }).click();
	await expect(page.getByRole('status').first()).toContainText('Demo complete');
	await page.getByRole('button', { name: 'Example claimed! Reset demo' }).click();
	await expect(page.getByRole('button', { name: 'Try the CLAIM button' })).toBeVisible();
	await page.getByRole('tab', { name: 'Moderation', exact: true }).click();
	await expect(page.getByText('Timeout recorded')).toBeVisible();
	await page.getByRole('tab', { name: 'Community', exact: true }).click();
	await expect(page.getByText('A little help goes a long way.')).toBeVisible();
	expect(externalRequests).toEqual([]);
});

test('filters and searches commands, with a recoverable empty state', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/#commands');
	await page.getByRole('button', { name: 'Moderation', exact: true }).click();
	await expect(page.locator('.command-row')).toHaveCount(3);
	await page.getByRole('textbox', { name: 'Search commands' }).fill('no-such-command');
	await expect(page.getByRole('heading', { name: 'No commands found' })).toBeVisible();
	await page.getByRole('button', { name: 'Clear filters' }).click();
	await page.getByRole('textbox', { name: 'Search commands' }).fill('/claim code');
	await expect(page.locator('.command-row')).toHaveCount(1);
	await page.locator('.command-row').click();
	await expect(page.getByRole('dialog')).toContainText('/claim code coupon_code:CODE');
	await page.getByRole('button', { name: 'Copy example' }).click();
	await expect(page.locator('.copy-status')).toHaveText('Copied to clipboard');
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/claim code coupon_code:CODE');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('FAQ explains optional perks and opens with the keyboard', async ({ page }) => {
	await page.goto('/');
	const question = page.getByRole('button', { name: 'Is Radon free to use?' });
	await question.focus();
	await page.keyboard.press('Enter');
	await expect(question).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/You do not have to vote before claiming/)).toBeVisible();
	await page.getByRole('button', { name: 'What happens when my Supporter Pass expires?' }).click();
	await expect(question).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByText(/All your accounts stay saved/)).toBeVisible();
});

test('all pages and game guide links work without horizontal scrolling', async ({ page, request }) => {
	for (const route of ['/', '/guide', '/guide/server', '/terms-of-service', '/privacy-policy', '/updates']) {
		const response = await page.goto(route);
		expect(response?.status()).toBe(200);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
	}
	for (const game of ['sololv', 'tskgb', 'nanarise']) {
		await page.goto(`/guide#${game}`);
		await expect(page.locator(`#${game}`)).toBeVisible();
	}
	const image = await request.get('/opengraph-image');
	expect(image.status()).toBe(200);
	expect(image.headers()['content-type']).toContain('image/png');
	expect((await request.get('/icon.svg')).status()).toBe(200);
});

test('layout fits small phones, tablets, and wide desktops', async ({ page }) => {
	await page.goto('/');
	for (const width of [320, 375, 640, 768, 1024, 1440, 1920]) {
		await page.setViewportSize({ width, height: 900 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`).toBeTruthy();
		await expect(page.locator('.header-invite')).toBeVisible();
	}
});

test('mobile navigation closes after choosing a destination', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'Mobile drawer only');
	await page.goto('/');
	await page.getByRole('button', { name: 'Open navigation' }).click();
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
	expect(accessibility.violations).toEqual([]);
	await drawer.getByRole('link', { name: 'Getting started' }).click();
	await expect(page).toHaveURL('/guide');
	await expect(drawer).not.toBeVisible();
});

test('pages and interactive states meet WCAG A and AA automated checks', async ({ page }) => {
	for (const route of ['/', '/guide', '/guide/server', '/terms-of-service', '/privacy-policy', '/updates']) {
		await page.goto(route);
		const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
		expect(
			results.violations,
			`${route}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`
		).toEqual([]);
	}
	await page.goto('/#commands');
	await page.locator('.command-row').first().click();
	const dialog = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
	expect(dialog.violations).toEqual([]);
});

test('secondary page back navigation stays above the title at every viewport', async ({ page }) => {
	for (const route of ['/terms-of-service', '/privacy-policy', '/guide', '/guide/server', '/updates']) {
		await page.goto(route);
		for (const width of [320, 640, 768, 1024, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await expect.poll(() => page.evaluate((expectedWidth) => matchMedia(`(width: ${expectedWidth}px)`).matches, width)).toBe(true);
			const back = page.getByRole('navigation', { name: 'Back navigation' });
			const intro = page.locator('.document-intro');
			const bounds = await page.evaluate(async () => {
				await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
				const introBox = document.querySelector('.document-intro')!.getBoundingClientRect();
				const navBox = document.querySelector('.document-back')!.getBoundingClientRect();
				return { x: introBox.x, width: introBox.width, y: introBox.y, backBottom: navBox.bottom };
			});
			expect(bounds.y).toBeGreaterThanOrEqual(bounds.backBottom + 20);
			// A translated/longer back label must never push the title sideways.
			await back.locator('span').evaluate((span) => {
				span.textContent = 'Back to Radon and the community';
			});
			const after = await intro.boundingBox();
			expect(after!.x).toBe(bounds.x);
			expect(after!.width).toBe(bounds.width);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}px`).toBeTruthy();
		}
		await page.getByRole('navigation', { name: 'Back navigation' }).getByRole('link').click();
		await expect(page).toHaveURL('/');
	}
});

test('updates are readable, linked, and reachable through navigation', async ({ page, isMobile }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'See all updates' }).click();
	await expect(page).toHaveURL('/updates');
	await expect(page.locator('.update-entry').first()).toBeVisible();
	await expect(page.locator('.update-entry').first()).toContainText('/bug');
	await expect(page.locator('.update-entry time').first()).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}/);
	await page.locator('.update-body h2 a').first().click();
	await expect(page).toHaveURL(/\/updates#.+/);
	await page.goto('/');
	if (isMobile) {
		await page.getByRole('button', { name: 'Open navigation' }).click();
		await page.getByRole('dialog').getByRole('link', { name: 'Updates', exact: true }).click();
	} else {
		await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Updates', exact: true }).click();
	}
	await expect(page).toHaveURL('/updates');
});

test('public pages have unique crawlable metadata and working discovery files', async ({ page, request }) => {
	const origin = 'https://radon-bot.vercel.app';
	const titles = new Set<string>();
	const descriptions = new Set<string>();
	for (const route of ['/', '/guide', '/guide/server', '/updates', '/terms-of-service', '/privacy-policy']) {
		await page.goto(route);
		const title = await page.title();
		const description = await page.locator('meta[name="description"]').getAttribute('content');
		expect(title.length).toBeGreaterThan(10);
		expect(description!.length).toBeGreaterThan(50);
		titles.add(title);
		descriptions.add(description!);
		expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).toString()).toBe(`${origin}${route}`);
		expect(new URL((await page.locator('meta[property="og:url"]').getAttribute('content'))!).toString()).toBe(`${origin}${route}`);
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
		await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description!);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${origin}/opengraph-image`);
		await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
		await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
		await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', `${origin}/opengraph-image`);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
	}
	expect(titles.size).toBe(6);
	expect(descriptions.size).toBe(6);
	const robots = await request.get('/robots.txt');
	expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
	const sitemap = await request.get('/sitemap.xml');
	const xml = await sitemap.text();
	for (const route of ['/', '/guide', '/guide/server', '/updates', '/terms-of-service', '/privacy-policy'])
		expect(xml).toContain(`<loc>${origin}${route}</loc>`);
	await page.goto('/');
	const schema = await page.locator('script[type="application/ld+json"]').evaluate((element) => JSON.parse(element.textContent!));
	expect(schema['@graph'].map((entry: { '@type': string }) => entry['@type'])).toEqual(['WebSite', 'SoftwareApplication']);
});

test('reduced motion disables decorative and page entrance animations', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	expect(
		await page
			.locator('.cta-sparkle')
			.first()
			.evaluate((element) => getComputedStyle(element).animationName)
	).toBe('none');
	await page.goto('/terms-of-service');
	expect(await page.locator('.document-intro').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
