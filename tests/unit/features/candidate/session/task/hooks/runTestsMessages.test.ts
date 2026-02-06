import {
  limitMessages,
  statusMap,
} from '@/features/candidate/session/task/hooks/runTestsMessages';

describe('runTestsMessages', () => {
  it('maps statuses to run states', () => {
    expect(statusMap.passed).toBe('success');
    expect(statusMap.failed).toBe('failed');
    expect(statusMap.timeout).toBe('timeout');
  });

  it('provides limit messages', () => {
    expect(limitMessages.attempts).toMatch(/Still running/i);
    expect(limitMessages.duration).toMatch(/longer than expected/i);
  });
});
