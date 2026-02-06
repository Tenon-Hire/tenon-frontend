import { dayStatusMeta } from '@/features/candidate/session/task/components/progress/dayStatus';

describe('dayStatusMeta', () => {
  it('returns in-progress tone and label for current day', () => {
    const meta = dayStatusMeta('current', 2);
    expect(meta.label.toLowerCase()).toBe('in progress');
    expect(meta.tone).toBe('warning');
    expect(meta.message).toBe('You are here');
  });

  it('returns completed tone and message for finished day', () => {
    const meta = dayStatusMeta('completed', 3);
    expect(meta.label.toLowerCase()).toBe('completed');
    expect(meta.tone).toBe('success');
    expect(meta.message).toBe('Done');
  });

  it('guards locked days and references previous day', () => {
    const meta = dayStatusMeta('locked', 4);
    expect(meta.label.toLowerCase()).toBe('locked');
    expect(meta.tone).toBe('muted');
    expect(meta.message).toContain('Day 3');
  });
});
