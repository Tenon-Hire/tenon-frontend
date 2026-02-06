import {
  copyInviteLink,
  formatRecruiterError,
  formatSimulationCreatedDate,
} from '@/features/recruiter/utils/formatters';

const originalExecCommand = document.execCommand;
const originalDebugErrors = process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;

describe('RecruiterDashboardContent helpers', () => {
  afterEach(() => {
    Reflect.deleteProperty(
      navigator as unknown as Record<string, unknown>,
      'clipboard',
    );
    (
      document as unknown as { execCommand?: typeof document.execCommand }
    ).execCommand = originalExecCommand;
    if (originalDebugErrors === undefined) {
      delete process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;
    } else {
      process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = originalDebugErrors;
    }
  });

  it('formats created date safely', () => {
    expect(formatSimulationCreatedDate('2025-12-10T10:00:00Z')).toBe(
      '2025-12-10',
    );
    expect(formatSimulationCreatedDate('2025-1')).toBe('2025-1');
    expect(formatSimulationCreatedDate(123 as unknown as string)).toBe('');
  });

  it('derives error message from object, detail, or fallback', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'true';
    expect(formatRecruiterError({ message: 'Boom' }, 'fallback')).toBe('Boom');
    expect(formatRecruiterError({ detail: 'Nope' }, 'fallback')).toBe('Nope');
    expect(formatRecruiterError(new Error('Err'), 'fallback')).toBe('Err');
    expect(formatRecruiterError(null, 'fallback')).toBe('fallback');
  });

  it('copies using navigator.clipboard when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await expect(copyInviteLink('   copied text  ')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('copied text');
  });

  it('falls back to execCommand when clipboard API is missing', async () => {
    const execSpy = jest.fn().mockReturnValue(true);
    (
      document as unknown as { execCommand?: typeof document.execCommand }
    ).execCommand = execSpy;

    await expect(copyInviteLink('copy me')).resolves.toBe(true);
    expect(execSpy).toHaveBeenCalledWith('copy');
  });

  it('returns false for empty clipboard input', async () => {
    await expect(copyInviteLink('   ')).resolves.toBe(false);
  });

  it('returns false when execCommand throws', async () => {
    const execSpy = jest.fn(() => {
      throw new Error('denied');
    });
    (
      document as unknown as { execCommand?: typeof document.execCommand }
    ).execCommand = execSpy;

    await expect(copyInviteLink('copy me')).resolves.toBe(false);
  });
});
