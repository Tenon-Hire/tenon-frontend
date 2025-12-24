import { test, expect } from "@playwright/test";

test("recruiter logs in and sees simulations", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByText(/simulations/i)).toBeVisible();
  await expect(page.getByTestId("simulation-row")).toBeVisible();
});
