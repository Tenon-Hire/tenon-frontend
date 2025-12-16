import { getAuthToken, setAuthToken } from "./auth";

describe("auth storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes and reads auth tokens", () => {
    setAuthToken("abc123");
    expect(localStorage.getItem("simuhire_token")).toBe("abc123");
    expect(getAuthToken()).toBe("abc123");
  });

  it("clears tokens when set to null", () => {
    localStorage.setItem("simuhire_token", "seed");
    setAuthToken(null);
    expect(localStorage.getItem("simuhire_token")).toBeNull();
    expect(getAuthToken()).toBeNull();
  });
});
