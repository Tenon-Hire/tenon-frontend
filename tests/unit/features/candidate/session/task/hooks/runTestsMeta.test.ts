import { runTestsDisplayMeta } from '@/features/candidate/session/task/hooks/runTestsMeta';

describe('runTestsDisplayMeta', () => {
  it('uses test results when available', () => {
    const meta = runTestsDisplayMeta('success', {
      status: 'passed',
      passed: 5,
      failed: 0,
      total: 5,
      message: '',
      stdout: null,
      stderr: null,
      workflowUrl: null,
      commitSha: null,
    });
    expect(meta.statusLabel).toBe('Passed');
    expect(meta.statusTone).toBe('success');
    expect(meta.disabled).toBe(false);
  });

  it('falls back to run state when no result', () => {
    const meta = runTestsDisplayMeta('running', null);
    expect(meta.statusLabel).toBe('Running');
    expect(meta.statusTone).toBe('info');
    expect(meta.disabled).toBe(true);
  });

  it('computes CTA labels', () => {
    const idleMeta = runTestsDisplayMeta('idle', null);
    const failedMeta = runTestsDisplayMeta('failed', {
      status: 'failed',
      passed: 0,
      failed: 1,
      total: 1,
      message: '',
      stdout: null,
      stderr: null,
      workflowUrl: null,
      commitSha: null,
    });
    expect(idleMeta.ctaLabel).toMatch(/Run tests/i);
    expect(failedMeta.ctaLabel).toMatch(/Retry tests/i);
  });
});
