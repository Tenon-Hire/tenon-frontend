export const statusMap: Record<string, 'success' | 'failed' | 'timeout'> = {
  passed: 'success',
  failed: 'failed',
  timeout: 'timeout',
};

export const limitMessages = {
  attempts: 'Still running. Open the workflow link to see progress.',
  duration:
    'This is taking longer than expected. Open the workflow link to track progress.',
};
