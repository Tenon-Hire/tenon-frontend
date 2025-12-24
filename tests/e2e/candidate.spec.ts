import { test, expect } from "@playwright/test";

test("candidate completes Day 1", async ({ page }) => {
  await page.goto("/candidate/test-token");

  await expect(page.getByText(/5-day simulation/i)).toBeVisible();

  await page.getByRole("button", { name: /start simulation/i }).click();
  await page.getByLabel(/your response/i).fill("Thoughtful answer for day one");
  await page.getByRole("button", { name: /submit/i }).click();

  await expect(page.getByText(/Day 2/i)).toBeVisible();
});
