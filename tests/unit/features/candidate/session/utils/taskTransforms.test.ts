import {
  normalizeCompletedTaskIds,
  toTask,
  deriveCurrentDayIndex,
} from '@/features/candidate/session/utils/taskTransforms';

describe('taskTransforms', () => {
  it('normalizes completed task ids from root or nested progress', () => {
    expect(
      normalizeCompletedTaskIds({
        completedTaskIds: [1, 2],
      }),
    ).toEqual([1, 2]);
    expect(
      normalizeCompletedTaskIds({
        progress: { completedTaskIds: [3] },
      }),
    ).toEqual([3]);
    expect(normalizeCompletedTaskIds({})).toEqual([]);
  });

  it('converts dto task to Task or null', () => {
    expect(toTask(null)).toBeNull();
    const t = toTask({
      id: 1,
      dayIndex: 2,
      type: 'code',
      title: 'T',
      description: 'D',
    });
    expect(t).toMatchObject({ id: 1, dayIndex: 2, type: 'code' });
  });

  it('derives current day index from completion flags', () => {
    expect(deriveCurrentDayIndex(2, { dayIndex: 3 }, false)).toBe(3);
    expect(deriveCurrentDayIndex(4, null, false)).toBe(5);
    expect(deriveCurrentDayIndex(5, null, true)).toBe(5);
  });
});
