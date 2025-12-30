import { test } from '@playwright/test';
import { CandidatePage } from './pages';
import { candidateToken, dayOneResponse } from './testData';

test('candidate completes Day 1', async ({ page }) => {
  const candidate = new CandidatePage(page);

  await candidate.gotoWithToken(candidateToken);
  await candidate.expectBootstrap();

  await candidate.startSimulation();
  await candidate.fillResponse(dayOneResponse);
  await candidate.submitTask();

  await candidate.expectDay(2);
});
