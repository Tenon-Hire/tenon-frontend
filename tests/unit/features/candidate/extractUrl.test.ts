import { extractFirstUrl } from '@/features/candidate/session/utils/extractUrl';

describe('extractFirstUrl', () => {
  it('returns null when no url exists', () => {
    expect(extractFirstUrl('No links here.')).toBeNull();
  });

  it('extracts the first https url from text', () => {
    expect(extractFirstUrl('See https://example.com/path for details.')).toBe(
      'https://example.com/path',
    );
  });

  it('trims trailing punctuation from urls', () => {
    expect(extractFirstUrl('Go to https://ex.com/demo, thanks.')).toBe(
      'https://ex.com/demo',
    );
  });
});
