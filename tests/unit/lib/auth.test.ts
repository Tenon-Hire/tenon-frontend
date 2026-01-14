import { getAuthToken, setAuthToken } from '@/lib/auth';

describe('auth token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads auth tokens', () => {
    setAuthToken('token-123');
    expect(getAuthToken()).toBe('token-123');
  });

  it('clears auth tokens when set to null', () => {
    setAuthToken('token-abc');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });
});
