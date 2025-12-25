import { expect, Page } from '@playwright/test';

export class RecruiterPage {
  constructor(private page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
  }

  async login() {
    await this.page.getByRole('button', { name: /continue/i }).click();
  }

  async expectDashboard() {
    await this.page.waitForURL('**/dashboard');
    await expect(this.page.getByText(/simulations/i)).toBeVisible();
    await expect(this.page.getByTestId('simulation-row')).toBeVisible();
  }
}
