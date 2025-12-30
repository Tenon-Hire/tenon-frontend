import {
  copyToClipboard,
  errorToMessage,
  formatCreatedDate,
} from '@/features/recruiter/utils/formatters';

const originalExecCommand = document.execCommand;

describe('RecruiterDashboardContent helpers', () => {
  afterEach(() => {
    Reflect.deleteProperty(
      navigator as unknown as Record<string, unknown>,
      'clipboard',
    );
    (
      document as unknown as { execCommand?: typeof document.execCommand }
    ).execCommand = originalExecCommand;
  });

  it('formats created date safely', () => {
    expect(formatCreatedDate('2025-12-10T10:00:00Z')).toBe('2025-12-10');
    expect(formatCreatedDate('2025-1')).toBe('2025-1');
    expect(formatCreatedDate(123 as unknown as string)).toBe('');
  });

  it('derives error message from object, detail, or fallback', () => {
    expect(errorToMessage({ message: 'Boom' }, 'fallback')).toBe('Boom');
    expect(errorToMessage({ detail: 'Nope' }, 'fallback')).toBe('Nope');
    expect(errorToMessage(new Error('Err'), 'fallback')).toBe('Err');
    expect(errorToMessage(null, 'fallback')).toBe('fallback');
  });

  it('copies using navigator.clipboard when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await expect(copyToClipboard('   copied text  ')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('copied text');
  });

  it('falls back to execCommand when clipboard API is missing', async () => {
    const execSpy = jest.fn().mockReturnValue(true);
    (
      document as unknown as { execCommand?: typeof document.execCommand }
    ).execCommand = execSpy;

    await expect(copyToClipboard('copy me')).resolves.toBe(true);
    expect(execSpy).toHaveBeenCalledWith('copy');
  });

  it('returns false for empty clipboard input', async () => {
    await expect(copyToClipboard('   ')).resolves.toBe(false);
  });

  it('returns false when execCommand throws', async () => {
    const execSpy = jest.fn(() => {
      throw new Error('denied');
    });
    (
      document as unknown as { execCommand?: typeof document.execCommand }
    ).execCommand = execSpy;

    await expect(copyToClipboard('copy me')).resolves.toBe(false);
  });
});
