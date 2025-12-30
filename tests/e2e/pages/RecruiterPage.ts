import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RecruiterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoLogin() {
    await this.goto('/login');
  }

  async login() {
    await this.clickButton(/continue/i);
  }

  async expectDashboard() {
    await this.expectUrl('**/dashboard');
    await this.expectVisibleText(/simulations/i);
    await this.expectRow();
  }

  private async expectRow() {
    await this.page.getByTestId('simulation-row').waitFor({ state: 'visible' });
  }
}
