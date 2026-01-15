import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).toBeTruthy();
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
});
