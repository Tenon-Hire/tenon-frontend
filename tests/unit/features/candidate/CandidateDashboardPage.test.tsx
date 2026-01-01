import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CandidateDashboardPage, {
  extractInviteToken,
} from '@/features/candidate/dashboard/CandidateDashboardPage';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';
import { listCandidateInvites } from '@/lib/api/candidate';

jest.mock('@auth0/nextjs-auth0/client', () => ({
  useUser: () => ({ user: { email: 'dash@example.com' } }),
  getAccessToken: jest.fn().mockResolvedValue('auth-token'),
}));

jest.mock('@/lib/api/candidate', () => ({
  listCandidateInvites: jest.fn(),
}));

const routerMock = {
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

const listInvitesMock = listCandidateInvites as jest.Mock;

function renderPage() {
  return render(
    <CandidateSessionProvider>
      <CandidateDashboardPage />
    </CandidateSessionProvider>,
  );
}

describe('CandidateDashboardPage', () => {
  beforeEach(() => {
    Object.values(routerMock).forEach((fn) => fn.mockReset());
    listInvitesMock.mockReset();
    listInvitesMock.mockResolvedValue([]);
  });

  it('shows invites list with continue CTA', async () => {
    listInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        token: 'INV123',
        title: 'Infra Simulation',
        role: 'Backend Engineer',
        company: 'SimuHire',
        status: 'in_progress',
        progress: { completed: 2, total: 5 },
        expiresAt: '2025-01-01',
        lastActivityAt: '2024-12-12',
        isExpired: false,
      },
    ]);

    renderPage();

    expect(await screen.findByText(/Infra Simulation/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(routerMock.push).toHaveBeenCalledWith('/candidate/session/INV123');
  });

  it('shows empty state when no invites', async () => {
    listInvitesMock.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/No invites yet/i)).toBeInTheDocument(),
    );
  });

  it('disables CTA for expired invites', async () => {
    listInvitesMock.mockResolvedValue([
      {
        candidateSessionId: 1,
        token: 'INV999',
        title: 'Old Simulation',
        role: 'Backend',
        company: null,
        status: 'expired',
        progress: null,
        expiresAt: '2024-01-01',
        lastActivityAt: '2024-01-02',
        isExpired: true,
      },
    ]);

    renderPage();

    expect(await screen.findByText(/Old Simulation/i)).toBeInTheDocument();
    const cta = screen.getByRole('button', {
      name: /Start simulation|Continue/i,
    });
    expect(cta).toBeDisabled();
  });

  it('parses canonical invite links and navigates', () => {
    expect(
      extractInviteToken('https://app.test/candidate/session/INV123'),
    ).toBe('INV123');
  });

  it('parses legacy invite links and normalizes to canonical route', () => {
    expect(
      extractInviteToken('https://app.test/candidate-sessions/INV123'),
    ).toBe('INV123');
  });

  it('strips query/hash when parsing raw tokens', () => {
    expect(extractInviteToken(' INV123?utm=1 ')).toBe('INV123');
    expect(extractInviteToken('INV123#frag')).toBe('INV123');
  });
});
