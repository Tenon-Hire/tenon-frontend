import { test } from '@playwright/test';
import { RecruiterPage } from './pages';

test('recruiter logs in and sees simulations', async ({ page }) => {
  const recruiter = new RecruiterPage(page);

  await recruiter.gotoLogin();
  await recruiter.login();
  await recruiter.expectDashboard();
});
