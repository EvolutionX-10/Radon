import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('server guide is discoverable from the player guide and navigation', async ({ page, isMobile }) => {
	await page.goto('/guide');
	await page
		.getByRole('navigation', { name: 'Guide topics' })
		.getByRole('link', { name: /Server guide/ })
		.click();
	await expect(page).toHaveURL('/guide/server');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good moderation.Less guesswork.');
	await expect(page.getByRole('navigation', { name: 'Guide topics' }).getByRole('link', { name: /Server guide/ })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.goto('/');
	if (isMobile) {
		await page.getByRole('button', { name: 'Open navigation' }).click();
		await page.getByRole('dialog').getByRole('link', { name: 'Server guide', exact: true }).click();
	} else {
		await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Server guide', exact: true }).click();
	}
	await expect(page).toHaveURL('/guide/server');
	await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('situation picker explains every action locally and links to the right chapter', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const errors: string[] = [];
	const externalRequests: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('request', (request) => {
		if (!['localhost', '127.0.0.1'].includes(new URL(request.url()).hostname)) externalRequests.push(request.url());
	});
	await page.goto('/guide/server');
	const cases = [
		['A rule was broken', 'Start with a warning', 'warnings'],
		['It needs to stop now', 'Give the conversation a breather', 'actions'],
		['Someone appeals', 'Look up what happened', 'cases'],
		['A member spots abuse', 'Report the message privately', 'reports'],
		['Spam keeps coming', 'Observe first. Automate when ready.', 'automod'],
		['A channel needs a pause', 'Pause the channel, then restore it', 'locks']
	];
	for (const [label, heading, anchor] of cases) {
		const button = page.getByRole('button', { name: label, exact: true });
		await button.click();
		await expect(button).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('.situation-options button[aria-pressed="true"]')).toHaveCount(1);
		await expect(page.locator('#situation-result').getByRole('heading')).toHaveText(heading);
		await page.locator('#situation-result .handbook-link').click();
		await expect(page).toHaveURL(`/guide/server#${anchor}`);
		const bounds = await page.locator(`#${anchor}`).boundingBox();
		expect(bounds!.y).toBeGreaterThan(70); // Clear of the sticky site header.
	}
	await page.getByRole('button', { name: 'Someone appeals', exact: true }).click();
	await page.locator('#situation-result').getByRole('button', { name: 'Copy /case history member:@Member', exact: true }).click();
	await expect(page.locator('#situation-result [role="status"]')).toContainText('Copied.');
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/case history member:@Member');
	await page.getByRole('button', { name: 'Someone appeals', exact: true }).focus();
	await page.keyboard.press('Tab');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: 'A member spots abuse', exact: true })).toHaveAttribute('aria-pressed', 'true');
	expect(errors).toEqual([]);
	expect(externalRequests).toEqual([]);
});

test('handbook chapters, diagrams, and expanded answers fit phones through desktops', async ({ page }) => {
	await page.goto('/guide/server');
	await page.locator('.handbook-question').evaluateAll((details) => details.forEach((element) => element.setAttribute('open', '')));
	for (const width of [320, 375, 480, 640, 768, 900, 1024, 1440, 1920]) {
		await page.setViewportSize({ width, height: 1000 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`).toBeTruthy();
		for (const selector of ['.record-map', '.severity-visual', '.lock-visual', '.situation-picker', '.guide-switcher']) {
			const box = await page.locator(selector).boundingBox();
			expect(box!.x, `${selector} at ${width}px`).toBeGreaterThanOrEqual(0);
			expect(box!.x + box!.width, `${selector} at ${width}px`).toBeLessThanOrEqual(width);
		}
	}
	await expect(page.locator('.handbook-chapter')).toHaveCount(10);
	await expect(page.locator('#cases')).toContainText('The Discord log message and warning record stay as they were.');
	await expect(page.locator('#actions')).toContainText('leaves the member banned');
});

test('picker and expandable answers remain accessible, including reduced motion', async ({ page }) => {
	await page.goto('/guide/server');
	await page.getByRole('button', { name: 'Someone appeals', exact: true }).click();
	const summary = page.getByText('Do we have to use every system?', { exact: true });
	await summary.focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('details').filter({ has: summary })).toHaveAttribute('open', '');
	await expect(page.getByText('You can keep your warning workflow and never open a case command.', { exact: false })).toBeVisible();
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
	expect(results.violations).toEqual([]);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(await page.locator('.situation-record').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
