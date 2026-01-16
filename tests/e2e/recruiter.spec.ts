import { test } from '@playwright/test';
import { RecruiterPage } from './pages';

test.describe.skip('brittle - re-enable after selector stabilization', () => {
  test('recruiter logs in and sees simulations', async ({ page }) => {
    // Skipping until selectors/copy stabilized; smoke test is the e2e gate.
    const recruiter = new RecruiterPage(page);

    await recruiter.gotoLogin();
    await recruiter.login();
    await recruiter.expectDashboard();
  });
});
