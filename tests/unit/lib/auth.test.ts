import { getAuthToken, setAuthToken } from '@/lib/auth';

describe('auth token helpers', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (k: string) => store[k] ?? null,
          setItem: (k: string, v: string) => {
            store[k] = v;
          },
          removeItem: (k: string) => {
            delete store[k];
          },
          clear: () => {
            store = {};
          },
        };
      })(),
      configurable: true,
    });
  });

  afterEach(() => {
    // @ts-expect-error reset window if modified
    global.window = originalWindow;
  });

  it('returns null on server without window', () => {
    // @ts-expect-error simulate server
    delete global.window;
    expect(getAuthToken()).toBeNull();
  });

  it('stores and clears token in localStorage', () => {
    setAuthToken('token123');
    expect(getAuthToken()).toBe('token123');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });
});
