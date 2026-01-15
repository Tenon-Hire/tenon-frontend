import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  timeout: 60_000,
  retries: 1,
  fullyParallel: true,
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: isCI
          ? 'npm run build && npm run start -- -p 3000'
          : 'npm run dev -- -p 3000',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
