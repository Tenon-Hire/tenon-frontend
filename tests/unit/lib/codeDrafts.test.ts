import {
  clearAllCodeDrafts,
  clearCodeDraft,
  codeDraftKey,
  hasCodeDraft,
  loadCodeDraft,
  saveCodeDraft,
} from '@/lib/storage/candidateDrafts';

describe('codeDrafts helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves, loads, and detects drafts', () => {
    const key = codeDraftKey(1, 2);
    expect(hasCodeDraft(1, 2)).toBe(false);

    saveCodeDraft(1, 2, "console.log('draft');");
    expect(sessionStorage.getItem(key)).toBe("console.log('draft');");

    expect(loadCodeDraft(1, 2)).toBe("console.log('draft');");
    expect(hasCodeDraft(1, 2)).toBe(true);
  });

  it('clears drafts safely', () => {
    saveCodeDraft('abc', 'def', 'code');
    expect(hasCodeDraft('abc', 'def')).toBe(true);

    clearCodeDraft('abc', 'def');
    expect(loadCodeDraft('abc', 'def')).toBeNull();
    expect(hasCodeDraft('abc', 'def')).toBe(false);
  });

  it('returns null when storage access fails', () => {
    const getItemSpy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    expect(loadCodeDraft(9, 9)).toBeNull();
    expect(hasCodeDraft(9, 9)).toBe(false);

    getItemSpy.mockRestore();
  });

  it('returns null on server (no window)', () => {
    const originalWindow = (global as unknown as { window?: Window }).window;
    delete (global as unknown as { window?: Window }).window;

    expect(loadCodeDraft(1, 1)).toBeNull();
    expect(hasCodeDraft(1, 1)).toBe(false);
    expect(() => saveCodeDraft(1, 1, 'noop')).not.toThrow();
    expect(() => clearCodeDraft(1, 1)).not.toThrow();

    (global as unknown as { window?: Window }).window = originalWindow;
  });

  it('swallows storage write errors when saving and clearing', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    const removeItemSpy = jest
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    expect(() => saveCodeDraft(3, 4, 'code')).not.toThrow();
    expect(() => clearCodeDraft(3, 4)).not.toThrow();

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('clears only code drafts when running clearAllCodeDrafts', () => {
    sessionStorage.setItem(codeDraftKey(1, 1), 'draft-one');
    sessionStorage.setItem(codeDraftKey('user', 'task'), 'draft-two');
    sessionStorage.setItem('simuhire:other:key', 'keep');

    clearAllCodeDrafts();

    expect(sessionStorage.getItem(codeDraftKey(1, 1))).toBeNull();
    expect(sessionStorage.getItem(codeDraftKey('user', 'task'))).toBeNull();
    expect(sessionStorage.getItem('simuhire:other:key')).toBe('keep');
  });
});
