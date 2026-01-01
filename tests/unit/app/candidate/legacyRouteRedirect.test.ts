import { redirect } from 'next/navigation';

jest.mock('next/navigation', () => {
  const redirectFn = jest.fn(() => {
    throw new Error('redirect');
  });
  return {
    redirect: redirectFn,
  };
});

describe('legacy candidate-sessions route', () => {
  it('redirects to the canonical /candidate/session path', async () => {
    const redirectMock = redirect as unknown as jest.Mock;
    const pageModule =
      await import('@/app/(candidate)/candidate-sessions/[token]/page');
    const page = pageModule.default;

    await expect(
      page({ params: Promise.resolve({ token: 'tok_123' }) } as never),
    ).rejects.toThrow('redirect');

    expect(redirectMock).toHaveBeenCalledWith('/candidate/session/tok_123');
  });
});
