/**
 * Additional tests for CandidateDashboardPage to close coverage gaps
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@/features/candidate/api', () => ({
  listCandidateInvites: (...args: unknown[]) =>
    listCandidateInvitesMock(...args),
}));

jest.mock('@/features/candidate/session/CandidateSessionProvider', () => ({
  useCandidateSession: () => useCandidateSessionMock(),
}));

describe('CandidateDashboardPage extra coverage', () => {
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

  describe('extractInviteToken', () => {
    it('extracts token with case insensitive match', () => {
      expect(
        extractInviteToken('http://app.com/CANDIDATE/SESSION/ABC123'),
      ).toBe('ABC123');
      expect(extractInviteToken('/CANDIDATE-SESSIONS/XYZ789')).toBe('XYZ789');
    });

    it('extracts last path segment for simple paths', () => {
      expect(extractInviteToken('simpletoken')).toBe('simpletoken');
      expect(extractInviteToken('path/token')).toBe('token');
    });

    it('handles paths with trailing slashes', () => {
      expect(extractInviteToken('/path/token/')).toBe('');
    });
  });

  describe('date and progress formatting', () => {
    it('handles invite without company', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'No Company Sim',
          role: 'Developer',
          company: null, // No company
          status: 'in_progress',
          isExpired: false,
          token: 'token1',
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('No Company Sim')).toBeInTheDocument();
      });

      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    it('handles invite without progress', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'No Progress Sim',
          role: 'Developer',
          status: 'not_started',
          isExpired: false,
          token: 'token2',
          progress: null, // No progress
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('No Progress Sim')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Progress:/)).not.toBeInTheDocument();
    });

    it('handles invite with progress total of 0', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Zero Progress Sim',
          role: 'Developer',
          status: 'in_progress',
          isExpired: false,
          token: 'token3',
          progress: { completed: 0, total: 0 },
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Zero Progress Sim')).toBeInTheDocument();
      });

      // Progress should not be shown when total is 0
      expect(screen.queryByText(/Progress:/)).not.toBeInTheDocument();
    });

    it('handles invalid date in lastActivityAt', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Invalid Date Sim',
          role: 'Developer',
          status: 'in_progress',
          isExpired: false,
          token: 'token4',
          lastActivityAt: 'invalid-date',
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid Date Sim')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Last active:/)).not.toBeInTheDocument();
    });

    it('handles invalid date in expiresAt', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Invalid Expiry Sim',
          role: 'Developer',
          status: 'in_progress',
          isExpired: false,
          token: 'token5',
          expiresAt: 'not-a-date',
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid Expiry Sim')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
    });

    it('handles null lastActivityAt', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Null Activity Sim',
          role: 'Developer',
          status: 'in_progress',
          isExpired: false,
          token: 'token6',
          lastActivityAt: null,
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Null Activity Sim')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Last active:/)).not.toBeInTheDocument();
    });

    it('handles null expiresAt', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Null Expiry Sim',
          role: 'Developer',
          status: 'in_progress',
          isExpired: false,
          token: 'token7',
          expiresAt: null,
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Null Expiry Sim')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
    });
  });

  describe('status formatting', () => {
    it('displays status with underscores replaced', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Status Test',
          role: 'Developer',
          status: 'in_progress',
          isExpired: false,
          token: 'token8',
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Status Test')).toBeInTheDocument();
      });

      expect(screen.getByText('in progress')).toBeInTheDocument();
    });
  });

  describe('progress percentage capping', () => {
    it('caps progress at 100% when completed > total', async () => {
      listCandidateInvitesMock.mockResolvedValue([
        {
          candidateSessionId: 1,
          title: 'Over Progress Sim',
          role: 'Developer',
          status: 'completed',
          isExpired: false,
          token: 'token9',
          progress: { completed: 10, total: 5 }, // More completed than total
        },
      ]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Over Progress Sim')).toBeInTheDocument();
      });

      expect(screen.getByText(/100% complete/)).toBeInTheDocument();
    });
  });

  describe('loading access token', () => {
    it('shows loading when auth status is loading', async () => {
      useCandidateSessionMock.mockReturnValue({
        state: {
          token: null,
          authStatus: 'loading',
          candidateSessionId: null,
          inviteToken: null,
        },
        loadAccessToken: jest.fn(),
      });

      listCandidateInvitesMock.mockResolvedValue([]);

      await act(async () => {
        render(<CandidateDashboardPage />);
      });

      // Loading state should not show invites list yet
      expect(listCandidateInvitesMock).not.toHaveBeenCalled();
    });
  });
});
