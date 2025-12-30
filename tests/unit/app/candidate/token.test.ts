import { requireCandidateToken } from '@/app/(candidate)/candidate-sessions/token-params';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('not found');
  }),
}));

describe('requireCandidateToken', () => {
  it('resolves and trims token', async () => {
    const token = await requireCandidateToken(
      Promise.resolve({ token: '  abc  ' }),
    );
    expect(token).toBe('abc');
  });

  it('throws via notFound when token missing', async () => {
    await expect(
      requireCandidateToken(Promise.resolve({ token: ' ' })),
    ).rejects.toThrow('not found');
  });
});
