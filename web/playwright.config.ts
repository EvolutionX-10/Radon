import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.pw.ts',
	fullyParallel: true,
	workers: 2,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		reducedMotion: 'reduce',
		trace: 'retain-on-failure',
		launchOptions: {
			...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {})
		}
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: 'bun run start --port 4173',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: false,
		env: { NEXT_TELEMETRY_DISABLED: '1' }
	}
});
