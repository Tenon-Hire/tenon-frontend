import { test } from '@playwright/test';
import { CandidatePage } from './pages/CandidatePage';

test('candidate completes Day 1', async ({ page }) => {
  const candidate = new CandidatePage(page);

  await candidate.goto('test-token');
  await candidate.expectBootstrap();

  await candidate.startSimulation();
  await candidate.fillResponse('Thoughtful answer for day one');
  await candidate.submitTask();

  await candidate.expectDay(2);
});
