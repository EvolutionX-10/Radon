import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { release } from '../lib/release';
import { updates } from '../lib/updates';

test('V3 announcement is discoverable and matches the shared Discord release', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /V3 PREVIEW/ }).click();
	await expect(page).toHaveURL(`/updates#${release.id}`);
	const entry = page.locator(`#${release.id}`);
	await expect(entry.getByRole('heading')).toHaveText(updates[0].title);
	await expect(entry.locator('li')).toHaveText(updates[0].changes);
	await expect(page.locator('.v3-status')).toHaveText(release.status);
	await expect(page.locator('.v3-comparison')).toHaveCount(release.improvements.length);
	await expect(page.locator('.v3-pill')).toContainText('Radon V3 · VERSION 3.0.0');
	await expect(page.locator('main')).not.toContainText('B3');
	await page.locator('.v3-next').getByRole('link', { name: 'Server guide' }).click();
	await expect(page).toHaveURL('/guide/server');
	await expect(page.locator('#setup')).toContainText('/setup start');
	await expect(page.locator('#setup')).toContainText('/doctor');
});

test('release graphics, badges, and copy fit every supported viewport', async ({ page }) => {
	for (const route of ['/', '/updates']) {
		await page.goto(route);
		for (const width of [320, 375, 480, 640, 768, 1024, 1051, 1150, 1440, 1920]) {
			await page.setViewportSize({ width, height: 950 });
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`).toBeTruthy();
			await expect(page.locator('.header-invite')).toBeVisible();
			if (route === '/updates') {
				const overlaps = await page.evaluate(() => {
					const a = document.querySelector('.v3-copy')!.getBoundingClientRect();
					const b = document.querySelector('.v3-art')!.getBoundingClientRect();
					return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
				});
				expect(overlaps, `release graphic overlaps copy at ${width}`).toBe(false);
				for (const tag of await page.locator('.v3-art-tag').all()) {
					const box = await tag.boundingBox();
					expect(box!.height, `stretched logo label at ${width}`).toBeLessThan(65);
				}
			}
		}
	}
});

test('release spotlight is accessible and respects reduced motion', async ({ page }) => {
	await page.goto('/updates');
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
	expect(results.violations).toEqual([]);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(await page.locator('.v3-logo').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
