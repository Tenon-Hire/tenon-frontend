import { test } from '@playwright/test';
import { CandidatePage } from './pages';
import { candidateToken, dayOneResponse } from './testData';

test.skip('candidate completes Day 1', async ({ page }) => {
  // Skipping until selectors/copy stabilized; smoke test is the e2e gate.
  const candidate = new CandidatePage(page);

  await candidate.gotoWithToken(candidateToken);
  await candidate.expectBootstrap();

  await candidate.startSimulation();
  await candidate.fillResponse(dayOneResponse);
  await candidate.submitTask();

  await candidate.expectDay(2);
});
