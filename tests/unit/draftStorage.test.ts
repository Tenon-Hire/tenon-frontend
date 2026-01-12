import {
  clearTextDraft,
  loadTextDraft,
  saveTextDraft,
} from '@/features/candidate/session/task/utils/draftStorage';

describe('draftStorage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('handles text drafts via sessionStorage', () => {
    expect(loadTextDraft(1)).toBe('');
    saveTextDraft(1, 'hello');
    expect(loadTextDraft(1)).toBe('hello');
    clearTextDraft(1);
    expect(loadTextDraft(1)).toBe('');
  });

  it('returns safe defaults when storage calls fail', () => {
    const getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    const removeItem = jest
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    expect(loadTextDraft(9)).toBe('');
    expect(() => clearTextDraft(9)).not.toThrow();

    getItem.mockRestore();
    removeItem.mockRestore();
  });

  it('short-circuits when window is undefined', () => {
    const globalWithWindow = global as unknown as { window?: Window };
    const originalWindow = globalWithWindow.window;
    globalWithWindow.window = undefined;

    expect(loadTextDraft(5)).toBe('');
    expect(() => saveTextDraft(5, 'x')).not.toThrow();
    expect(() => clearTextDraft(5)).not.toThrow();

    globalWithWindow.window = originalWindow;
  });
});
