import { clearCodeDraft, codeDraftKey, hasCodeDraft, loadCodeDraft, saveCodeDraft } from "./codeDrafts";

describe("codeDrafts helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("saves, loads, and detects drafts", () => {
    const key = codeDraftKey(1, 2);
    expect(hasCodeDraft(1, 2)).toBe(false);

    saveCodeDraft(1, 2, "console.log('draft');");
    expect(sessionStorage.getItem(key)).toBe("console.log('draft');");

    expect(loadCodeDraft(1, 2)).toBe("console.log('draft');");
    expect(hasCodeDraft(1, 2)).toBe(true);
  });

  it("clears drafts safely", () => {
    saveCodeDraft("abc", "def", "code");
    expect(hasCodeDraft("abc", "def")).toBe(true);

    clearCodeDraft("abc", "def");
    expect(loadCodeDraft("abc", "def")).toBeNull();
    expect(hasCodeDraft("abc", "def")).toBe(false);
  });
});
