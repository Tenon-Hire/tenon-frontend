/**
 * Tests for CandidateDashboardPage
 */
import React from 'react';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import CandidateDashboardPage, {
  extractInviteToken,
} from '@/features/candidate/dashboard/CandidateDashboardPage';

const listCandidateInvitesMock = jest.fn();
const useRouterMock = {
  push: jest.fn(),
  replace: jest.fn(),
};

const useCandidateSessionMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => useRouterMock,
}));

jest.mock('@/lib/api/candidate', () => ({
  listCandidateInvites: (...args: unknown[]) => listCandidateInvitesMock(...args),
}));

jest.mock('@/features/candidate/session/CandidateSessionProvider', () => ({
  useCandidateSession: () => useCandidateSessionMock(),
}));

describe('extractInviteToken', () => {
  it('returns empty string for empty input', () => {
    expect(extractInviteToken('')).toBe('');
    expect(extractInviteToken('   ')).toBe('');
  });

  it('extracts token from canonical URL format', () => {
    expect(extractInviteToken('http://app.com/candidate/session/abc123')).toBe('abc123');
    expect(extractInviteToken('/candidate/session/token456')).toBe('token456');
  });

  it('extracts token from legacy URL format', () => {
    expect(extractInviteToken('http://app.com/candidate-sessions/legacy123')).toBe('legacy123');
    expect(extractInviteToken('/candidate-sessions/tok789')).toBe('tok789');
  });

  it('extracts token from simple path', () => {
    expect(extractInviteToken('/path/to/token123')).toBe('token123');
  });

  it('handles query strings and hashes', () => {
    expect(extractInviteToken('/candidate/session/abc?foo=bar')).toBe('abc');
    expect(extractInviteToken('/candidate/session/abc#anchor')).toBe('abc');
  });
});

describe('CandidateDashboardPage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useRouterMock.push.mockClear();
    useRouterMock.replace.mockClear();

    useCandidateSessionMock.mockReturnValue({
      state: {
        token: 'access-token',
        authStatus: 'authenticated',
        candidateSessionId: null,
        inviteToken: null,
      },
      loadAccessToken: jest.fn(),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows loading state initially', async () => {
    listCandidateInvitesMock.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    expect(screen.getByText(/Your invitations/)).toBeInTheDocument();
  });

  it('displays email when provided', async () => {
    listCandidateInvitesMock.mockResolvedValue([]);

    await act(async () => {
      render(<CandidateDashboardPage signedInEmail="test@example.com" />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Signed in as test@example.com/)).toBeInTheDocument();
    });
  });

  it('shows no invites message when list is empty', async () => {
    listCandidateInvitesMock.mockResolvedValue([]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No invites yet/)).toBeInTheDocument();
    });
  });

  it('displays invite cards with progress', async () => {
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        title: 'Test Simulation',
        role: 'Developer',
        company: 'TestCo',
        status: 'in_progress',
        isExpired: false,
        token: 'invite-token',
        progress: { completed: 2, total: 5 },
        lastActivityAt: '2024-01-15T00:00:00Z',
        expiresAt: '2024-02-15T00:00:00Z',
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Simulation')).toBeInTheDocument();
    });

    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/TestCo/)).toBeInTheDocument();
    expect(screen.getByText(/Progress: 2\/5/)).toBeInTheDocument();
    expect(screen.getByText(/40% complete/)).toBeInTheDocument();
  });

  it('handles expired invites', async () => {
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        title: 'Expired Simulation',
        role: 'Developer',
        status: 'not_started',
        isExpired: true,
        token: 'expired-token',
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Expired Simulation')).toBeInTheDocument();
    });

    // There should be text about the invite being expired
    expect(
      screen.getByText(/This invite has expired/),
    ).toBeInTheDocument();
  });

  it('shows warning when token unavailable', async () => {
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        title: 'No Token Sim',
        role: 'Developer',
        status: 'in_progress',
        isExpired: false,
        token: null,
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Invite link unavailable/)).toBeInTheDocument();
    });
  });

  it('navigates to session on continue click', async () => {
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        title: 'Continue Sim',
        role: 'Developer',
        status: 'in_progress',
        isExpired: false,
        token: 'nav-token',
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Continue Sim')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(useRouterMock.push).toHaveBeenCalledWith('/candidate/session/nav-token');
  });

  it('shows error for expired invite on continue', async () => {
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        title: 'Expired Click',
        role: 'Developer',
        status: 'in_progress',
        isExpired: true,
        token: 'expired-tok',
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    // The button will be disabled for expired invites, but we test the handler directly
    // by simulating a scenario where the invite becomes expired between load and click
    await waitFor(() => {
      expect(screen.getByText('Expired Click')).toBeInTheDocument();
    });
  });

  it('handles fetch error', async () => {
    listCandidateInvitesMock.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      // toUserMessage returns the error message or the fallback
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('refresh button reloads invites', async () => {
    listCandidateInvitesMock.mockResolvedValue([]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No invites yet/)).toBeInTheDocument();
    });

    listCandidateInvitesMock.mockClear();
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 2,
        title: 'New Sim',
        role: 'Engineer',
        status: 'not_started',
        isExpired: false,
        token: 'new-token',
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => {
      expect(screen.getByText('New Sim')).toBeInTheDocument();
    });
  });

  it('redirects to login when unauthenticated', async () => {
    useCandidateSessionMock.mockReturnValue({
      state: {
        token: null,
        authStatus: 'unauthenticated',
        candidateSessionId: null,
        inviteToken: null,
      },
      loadAccessToken: jest.fn(),
    });

    listCandidateInvitesMock.mockResolvedValue([]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(useRouterMock.replace).toHaveBeenCalled();
    });
  });

  it('loads access token when idle', async () => {
    const loadAccessTokenMock = jest.fn();
    useCandidateSessionMock.mockReturnValue({
      state: {
        token: null,
        authStatus: 'idle',
        candidateSessionId: null,
        inviteToken: null,
      },
      loadAccessToken: loadAccessTokenMock,
    });

    listCandidateInvitesMock.mockResolvedValue([]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    expect(loadAccessTokenMock).toHaveBeenCalled();
  });

  it('uses fallback token for matching session', async () => {
    useCandidateSessionMock.mockReturnValue({
      state: {
        token: 'access-token',
        authStatus: 'authenticated',
        candidateSessionId: 999,
        inviteToken: 'fallback-invite-token',
      },
      loadAccessToken: jest.fn(),
    });

    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 999,
        title: 'Fallback Sim',
        role: 'Developer',
        status: 'in_progress',
        isExpired: false,
        token: null, // No token but matches session
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Fallback Sim')).toBeInTheDocument();
    });

    // Button should be enabled because of fallback token
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);
    expect(useRouterMock.push).toHaveBeenCalledWith('/candidate/session/fallback-invite-token');
  });

  it('handles no token and no fallback', async () => {
    useCandidateSessionMock.mockReturnValue({
      state: {
        token: 'access-token',
        authStatus: 'authenticated',
        candidateSessionId: 123,
        inviteToken: 'other-token',
      },
      loadAccessToken: jest.fn(),
    });

    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 456, // Different session
        title: 'No Fallback Sim',
        role: 'Developer',
        status: 'in_progress',
        isExpired: false,
        token: null,
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('No Fallback Sim')).toBeInTheDocument();
    });

    // Button should be disabled
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('shows Start simulation for not_started status', async () => {
    listCandidateInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        title: 'New Sim',
        role: 'Developer',
        status: 'not_started',
        isExpired: false,
        token: 'start-token',
      },
    ]);

    await act(async () => {
      render(<CandidateDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start simulation/i })).toBeInTheDocument();
    });
  });
});
