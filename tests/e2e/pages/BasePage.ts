import { expect, Page } from '@playwright/test';

export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  protected async goto(path: string) {
    await this.page.goto(path);
  }

  protected async clickButton(name: RegExp | string) {
    await this.page.getByRole('button', { name }).click();
  }

  protected async fillByLabel(label: RegExp | string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  protected async expectVisibleText(text: RegExp | string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  protected async expectUrl(pattern: string) {
    await this.page.waitForURL(pattern);
  }

  protected async expectHeading(name: RegExp | string) {
    await expect(this.page.getByRole('heading', { name })).toBeVisible();
  }
}
