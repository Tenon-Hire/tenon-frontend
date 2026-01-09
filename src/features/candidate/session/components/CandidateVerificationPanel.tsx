import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  confirmCandidateVerificationCode,
  sendCandidateVerificationCode,
} from '@/lib/api/candidate';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type CandidateVerificationPanelProps = {
  token: string;
  initialEmail?: string | null;
  errorMessage?: string | null;
  onVerified: (accessToken: string, email: string) => void;
  onBack?: () => void;
};

type OtpErrorDetails = {
  status?: number;
  otpError?: string;
  retryAfterSeconds?: number;
  message?: string;
};

function parseOtpError(err: unknown): OtpErrorDetails {
  if (!err || typeof err !== 'object') return {};
  const record = err as Record<string, unknown>;
  return {
    status: typeof record.status === 'number' ? record.status : undefined,
    otpError: typeof record.otpError === 'string' ? record.otpError : undefined,
    retryAfterSeconds:
      typeof record.retryAfterSeconds === 'number'
        ? record.retryAfterSeconds
        : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}

function formatCountdown(seconds: number, padMinutes = false): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const minutes = padMinutes ? String(mins).padStart(2, '0') : String(mins);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isMinimalEmail(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.includes('@')) return false;
  const [, domain = ''] = trimmed.split('@');
  return domain.includes('.');
}

export function CandidateVerificationPanel({
  token,
  initialEmail,
  errorMessage,
  onVerified,
  onBack,
}: CandidateVerificationPanelProps) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => ''),
  );
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying'>(
    'idle',
  );
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [lockRemaining, setLockRemaining] = useState<number>(0);
  const [lockCountdownActive, setLockCountdownActive] =
    useState<boolean>(false);
  const [sendLimitReached, setSendLimitReached] = useState<boolean>(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const sentOnceRef = useRef<string | null>(null);

  const codeValue = useMemo(() => digits.join(''), [digits]);
  const isComplete = codeValue.length === OTP_LENGTH;
  const emailIsValid = useMemo(() => isMinimalEmail(email), [email]);
  const inputsDisabled = locked || verifyStatus === 'verifying';
  const resendDisabled =
    locked ||
    sendLimitReached ||
    status === 'sending' ||
    verifyStatus === 'verifying' ||
    cooldown > 0 ||
    !token;

  const expiresLabel = useMemo(() => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [expiresAt]);

  const focusIndex = useCallback((index: number) => {
    const input = inputsRef.current[index];
    if (input) input.focus();
  }, []);

  const applyReplacementFrom = useCallback(
    (startIndex: number, value: string, prev: string[]) => {
      const clean = normalizeDigits(value);
      if (!clean) return { next: null as string[] | null, nextIndex: null };
      if (startIndex < 0 || startIndex >= OTP_LENGTH) {
        return { next: null as string[] | null, nextIndex: null };
      }
      const chunk = clean.slice(0, OTP_LENGTH - startIndex);
      return {
        next: prev.map((digit, idx) => {
          if (idx < startIndex) return digit;
          const nextDigit = chunk[idx - startIndex];
          return nextDigit ? nextDigit : '';
        }),
        nextIndex: Math.min(startIndex + chunk.length, OTP_LENGTH - 1),
      };
    },
    [],
  );

  const resetDigits = useCallback(() => {
    setDigits(Array.from({ length: OTP_LENGTH }, () => ''));
    focusIndex(0);
  }, [focusIndex]);

  const handleSendCode = useCallback(async () => {
    if (
      !token ||
      locked ||
      status === 'sending' ||
      verifyStatus === 'verifying' ||
      cooldown > 0
    )
      return;
    setStatus('sending');
    setInlineError(null);
    setSendLimitReached(false);

    try {
      const response = await sendCandidateVerificationCode(token);
      setMaskedEmail((prev) => response.maskedEmail || prev);
      setExpiresAt(response.expiresAt ?? null);
      setCooldown(response.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      setStatus('sent');
    } catch (err) {
      const parsed = parseOtpError(err);
      if (parsed.status === 404 || parsed.status === 410) {
        setInlineError(parsed.message ?? 'That invite link is invalid.');
      } else if (parsed.otpError === 'otp_send_limit') {
        setSendLimitReached(true);
        setInlineError(
          'You’ve requested too many codes. Contact support for help.',
        );
      } else if (parsed.otpError === 'otp_cooldown') {
        setCooldown(parsed.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
        setInlineError('We already sent a code. Please wait before resending.');
      } else {
        setInlineError(
          parsed.message ?? 'Unable to send a verification code right now.',
        );
      }
      setStatus('error');
    }
  }, [cooldown, locked, status, token, verifyStatus]);

  useEffect(() => {
    if (!token) return;
    if (sentOnceRef.current === token) return;
    if (status !== 'idle') return;
    if (locked || verifyStatus === 'verifying' || cooldown > 0) return;

    sentOnceRef.current = token;
    setStatus('sending');
    setInlineError(null);
    setSendLimitReached(false);

    void (async () => {
      try {
        const response = await sendCandidateVerificationCode(token);
        setMaskedEmail((prev) => response.maskedEmail || prev);
        setExpiresAt(response.expiresAt ?? null);
        setCooldown(response.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
        setStatus('sent');
      } catch (err) {
        const parsed = parseOtpError(err);
        if (parsed.status === 404 || parsed.status === 410) {
          setInlineError(parsed.message ?? 'That invite link is invalid.');
        } else if (parsed.otpError === 'otp_send_limit') {
          setSendLimitReached(true);
          setInlineError(
            'You’ve requested too many codes. Contact support for help.',
          );
        } else if (parsed.otpError === 'otp_cooldown') {
          setCooldown(parsed.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
          setInlineError(
            'We already sent a code. Please wait before resending.',
          );
        } else {
          setInlineError(
            parsed.message ?? 'Unable to send a verification code right now.',
          );
        }
        setStatus('error');
      }
    })();
  }, [cooldown, locked, status, token, verifyStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!locked || lockRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setLockRemaining((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockRemaining, locked]);

  useEffect(() => {
    if (!locked || lockRemaining > 0 || !lockCountdownActive) return;
    setLocked(false);
    setLockCountdownActive(false);
    setInlineError(null);
  }, [lockCountdownActive, lockRemaining, locked]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (inputsDisabled) return;
      const clean = normalizeDigits(value);
      if (!clean) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }

      setInlineError(null);
      if (clean.length > 1) {
        const nextFocusIndex = Math.min(
          index + Math.min(clean.length, OTP_LENGTH - index),
          OTP_LENGTH - 1,
        );
        setDigits((prev) => {
          const { next } = applyReplacementFrom(index, clean, prev);
          return next ?? prev;
        });
        focusIndex(nextFocusIndex);
        return;
      }

      setDigits((prev) => {
        const next = [...prev];
        next[index] = clean;
        return next;
      });

      if (index < OTP_LENGTH - 1) {
        focusIndex(index + 1);
      }
    },
    [applyReplacementFrom, focusIndex, inputsDisabled],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (inputsDisabled) return;
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        focusIndex(index - 1);
        return;
      }
      if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
        event.preventDefault();
        focusIndex(index + 1);
        return;
      }
      if (event.key !== 'Backspace') return;
      event.preventDefault();
      setInlineError(null);
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }
      if (index > 0) {
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        focusIndex(index - 1);
      }
    },
    [digits, focusIndex, inputsDisabled],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (inputsDisabled) return;
      const data = normalizeDigits(event.clipboardData.getData('text'));
      if (!data) return;
      event.preventDefault();
      setInlineError(null);
      const target = event.target as HTMLElement | null;
      const indexValue = target?.getAttribute('data-otp-index');
      const startIndex = indexValue ? Number(indexValue) : 0;
      const safeIndex = Number.isFinite(startIndex) ? startIndex : 0;
      if (data.length === 1) {
        setDigits((prev) => {
          const next = [...prev];
          next[safeIndex] = data;
          return next;
        });
        if (safeIndex < OTP_LENGTH - 1) {
          focusIndex(safeIndex + 1);
        }
        return;
      }
      const nextFocusIndex = Math.min(
        safeIndex + Math.min(data.length, OTP_LENGTH - safeIndex),
        OTP_LENGTH - 1,
      );
      setDigits((prev) => {
        const { next } = applyReplacementFrom(safeIndex, data, prev);
        return next ?? prev;
      });
      focusIndex(nextFocusIndex);
    },
    [applyReplacementFrom, focusIndex, inputsDisabled],
  );

  const handleVerify = useCallback(async () => {
    if (inputsDisabled) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!isMinimalEmail(trimmedEmail)) {
      setInlineError('Enter the email that received the invite.');
      return;
    }
    if (!isComplete) {
      setInlineError('Enter the full 6-digit code.');
      return;
    }

    setVerifyStatus('verifying');
    setInlineError(null);

    try {
      const response = await confirmCandidateVerificationCode(
        token,
        trimmedEmail,
        codeValue,
      );
      if (response.candidateAccessToken) {
        onVerified(response.candidateAccessToken, trimmedEmail);
      } else {
        setInlineError('Unable to verify that code right now.');
      }
    } catch (err) {
      const parsed = parseOtpError(err);
      if (parsed.otpError === 'otp_locked') {
        setLocked(true);
        const retryAfter = parsed.retryAfterSeconds ?? 0;
        setLockRemaining(retryAfter);
        setLockCountdownActive(retryAfter > 0);
        setInlineError(
          parsed.retryAfterSeconds
            ? `Too many attempts. Try again in ${formatCountdown(
                parsed.retryAfterSeconds,
                true,
              )}. Contact support if you need help.`
            : 'Too many attempts. This invite is locked. Contact support.',
        );
      } else if (parsed.otpError === 'otp_expired') {
        setInlineError('That code expired. Request a new one.');
        resetDigits();
      } else if (parsed.otpError === 'invalid_otp') {
        setInlineError('That code doesn’t match. Try again.');
      } else if (parsed.otpError === 'email_mismatch') {
        setInlineError('That email doesn’t match the invite.');
      } else {
        setInlineError(parsed.message ?? 'Unable to verify that code.');
      }
    } finally {
      setVerifyStatus('idle');
    }
  }, [
    codeValue,
    email,
    inputsDisabled,
    isComplete,
    onVerified,
    resetDigits,
    token,
  ]);

  const hintLine = maskedEmail
    ? `We sent a 6-digit code to ${maskedEmail}.`
    : 'We sent a 6-digit code to your invite email.';
  const lockoutMessage = locked
    ? lockRemaining > 0
      ? `Too many attempts. Try again in ${formatCountdown(
          lockRemaining,
          true,
        )}. Contact support if you need help.`
      : 'Too many attempts. This invite is locked. Contact support.'
    : null;
  const displayedError = errorMessage ?? lockoutMessage ?? inlineError;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
      <div>
        <div className="text-2xl font-semibold text-gray-900">
          Verify your invite
        </div>
        <p className="mt-1 text-sm text-gray-600">{hintLine}</p>
        {expiresLabel ? (
          <p className="mt-1 text-xs text-gray-500">
            Code expires around {expiresLabel}.
          </p>
        ) : null}
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Invite email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setInlineError(null);
            }}
            placeholder="you@example.com"
            disabled={inputsDisabled}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Verification code
          </label>
          <div
            className="flex flex-wrap gap-2"
            onPaste={handlePaste}
            aria-label="Verification code"
          >
            {digits.map((digit, index) => (
              <input
                key={`otp-${index}`}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                data-otp-index={index}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(event) =>
                  handleDigitChange(index, event.target.value)
                }
                onKeyDown={(event) => handleKeyDown(event, index)}
                disabled={inputsDisabled}
                className="h-12 w-11 rounded-md border border-gray-300 text-center text-lg font-semibold text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[44px]">
          {displayedError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {displayedError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={() => void handleVerify()}
            disabled={inputsDisabled || !emailIsValid || !isComplete}
            className="w-full sm:w-auto"
          >
            {verifyStatus === 'verifying' ? 'Verifying…' : 'Verify code'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleSendCode()}
            disabled={resendDisabled}
            className="w-full sm:w-auto"
          >
            {cooldown > 0
              ? `Resend in ${formatCountdown(cooldown)}`
              : 'Resend code'}
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          Need help?{' '}
          <a className="underline" href="mailto:support@tenon.ai">
            Email support@tenon.ai.
          </a>
        </div>
      </Card>

      {onBack ? (
        <Button variant="secondary" onClick={onBack} className="w-full">
          Back to Candidate Dashboard
        </Button>
      ) : null}
    </div>
  );
}
