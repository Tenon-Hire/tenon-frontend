import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CandidatePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoWithToken(token: string) {
    await this.goto(`/candidate-sessions/${token}`);
  }

  async expectBootstrap() {
    await this.expectVisibleText(/5-day simulation/i);
  }

  async startSimulation() {
    await this.clickButton(/start simulation/i);
  }

  async fillResponse(text: string) {
    await this.fillByLabel(/your response/i, text);
  }

  async submitTask() {
    await this.clickButton(/submit/i);
  }

  async expectDay(day: number) {
    await this.expectHeading(new RegExp(`Day ${day}`, 'i'));
  }
}
