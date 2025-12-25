import { expect, Page } from '@playwright/test';

export class CandidatePage {
  constructor(private page: Page) {}

  async goto(token: string) {
    await this.page.goto(`/candidate/${token}`);
  }

  async expectBootstrap() {
    await expect(this.page.getByText(/5-day simulation/i)).toBeVisible();
  }

  async startSimulation() {
    await this.page.getByRole('button', { name: /start simulation/i }).click();
  }

  async fillResponse(text: string) {
    await this.page.getByLabel(/your response/i).fill(text);
  }

  async submitTask() {
    await this.page.getByRole('button', { name: /submit/i }).click();
  }

  async expectDay(day: number) {
    await expect(
      this.page.getByText(new RegExp(`Day ${day}`, 'i')),
    ).toBeVisible();
  }
}
