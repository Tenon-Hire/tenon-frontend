import { extractToken } from '@/app/(candidate)/candidate/token';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('not found');
  }),
}));

describe('extractToken', () => {
  it('resolves and trims token', async () => {
    const token = await extractToken(Promise.resolve({ token: '  abc  ' }));
    expect(token).toBe('abc');
  });

  it('throws via notFound when token missing', async () => {
    await expect(extractToken(Promise.resolve({ token: ' ' }))).rejects.toThrow(
      'not found',
    );
  });
});
